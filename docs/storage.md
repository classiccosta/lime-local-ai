# Browser storage

What the app keeps on disk, how it knows which models are downloaded, and why
the browser's storage figures are only approximate. There is no storage meter in
the UI (ADR-011); the figures are read only to know what is cached.

> **Dormant in v1.** Everything here serves the WebGPU backend, which is paused (ADR-012).
> With `WEBGPU_ENABLED` off no weights are downloaded; only conversations (IndexedDB)
> and preferences (`localStorage`) are written.

- **Service:** [`src/services/modelCache.js`](../src/services/modelCache.js)
- **Hook:** [`src/features/models/hooks/useStorage.js`](../src/features/models/hooks/useStorage.js)

---

## What is stored, and where

Two mechanisms, with very different footprints:

| What          | Where                           | Order of magnitude   |
| ------------- | ------------------------------- | -------------------- |
| Model weights | Cache API, `transformers-cache` | 390 MB – 1.5 GB each |
| Conversations | IndexedDB, `sessions` store     | kilobytes            |

The cache name is `transformers-cache` because that is `env.cacheKey` in
transformers.js. It is hard-coded rather than imported so that reading a string
does not pull the ~23 MB runtime into the initial bundle.

Everything else the app keeps — the endpoint, the panel open/closed states — is a
handful of bytes in localStorage.

## Disk is not memory

Everything here is about **disk**. Nothing in the app reports RAM or VRAM:

- Models are loaded with `device: 'webgpu'`, so the weights live in GPU buffers.
  They are not on the JS heap and `performance.memory` would not see them even
  where it exists.
- [`llm.js`](../src/services/llm.js) keeps every model loaded this session in a
  module-level `Map` and disposes one only when the user deletes it. Load both
  catalogue entries and both stay resident. Nothing in the UI reports that.

No browser API exposes live VRAM usage. `navigator.deviceMemory` (Chromium only)
gives coarse system RAM, and a WebGPU adapter's `limits.maxBufferSize` gives a
ceiling, not a reading. Neither is used here.

## Loaded is not cached

Two different questions, answered by two different pieces of state, and the panel
shows both:

| Question                        | State                        | Survives reload |
| ------------------------------- | ---------------------------- | --------------- |
| Are the weights on disk?        | `storage.cachedModelIds`     | yes             |
| Is the model ready to generate? | `useModels().loadedModelIds` | no              |

`loadedModelIds` mirrors the module-level `Map` in `llm.js`. A model cached on
disk still has to be read, compiled and uploaded to the GPU after a reload, so it
is _cached_ but not _loaded_ until something loads it.

In the settings model list ([`ModelList.jsx`](../src/features/models/components/ModelList.jsx),
rows built in `pickerItems.js`), a model on disk gets a drive icon and can be picked; one
that isn't is dimmed and fetched from its own download icon. Only a model that is
both selected _and_ in `loadedModelIds` is marked active.

The `attempt` in `useModels` describes the most recent load and nothing more. It
cannot answer "is this model ready" once the selection has moved on, which is why
`isReady` consults `loadedModelIds` instead. The list shows a spinner on the row
`loadingModelId` names; there is no progress bar and no way to stop a download
short of deleting the model.

### Restoring the state across a refresh

Two pieces of state cooperate so a reload comes back where it left off:

| State             | Where           | Restored by              |
| ----------------- | --------------- | ------------------------ |
| `selectedModelId` | `ai-chat:model` | `useModels`              |
| `loadedModelIds`  | not persisted   | re-loading cached models |

`loadedModelIds` is deliberately not persisted. Restoring it would mark as ready a
model that `generate()` would reject with "Model is not loaded yet." Instead
`useModelSetup` re-establishes the fact: once the model list and cache contents are
known, an effect loads **every** in-browser model whose weights are in
`cachedModelIds`, one at a time, selected model first. Reading from the cache
costs GPU memory and compile time but no network, and a `useRef` guard stops a
later storage refresh from firing it again. The picker's in-browser rows stay
hidden until this settles.

A restored `selectedModelId` can point at a model the list no longer offers: the
endpoint dropped it, or the browser has no WebGPU for a catalogue model. Once the
restore settles, `useModelSetup` clears such an id (persisting `''`) so auto-select can
pick one that answers. The check is `isStaleSelection` in
`features/models/selection.js`. It runs after the restore and on every list
change. It waits for the restore because the list is `[]` while `/models` first
loads and every id would look missing. An endpoint model is kept while the
endpoint is unreachable, since LM Studio not running yet is a normal startup and
the model comes back on reconnect. A stale clear re-arms auto-select, which
otherwise fires once, so a loaded WebGPU model takes over from a dropped endpoint
model.

The cost is real and worth stating: every refresh spends the VRAM of every cached
model whether or not the user goes on to chat. A download interrupted by closing
the tab leaves files behind, so the restore resumes it on the next load.

---

## Reading the cache

`readStorage()` calls `navigator.storage.estimate()` and then reads the model
cache. Only `cachedModelIds` is used today; `usage`, `quota` and the breakdown are
still returned but nothing renders them. Every browser fuzzes `estimate()`
(Chromium ties quota to free disk, Firefox rounds usage, Safari raises the quota
on demand), so the figures are good enough to warn with and never to gate on.

`cachedModelIds` comes from one `keys()` pass over `transformers-cache`,
substring-matching each catalogue id against the request URLs (transformers.js
keys entries by their Hugging Face URL, which embeds the repo id). An interrupted
download leaves some files behind, so this means _has files for_, not _complete_
— the loader re-fetches whatever is missing either way.

Before that first read, `pruneRetiredModels()` deletes the files of any repo the
catalogue no longer lists (e.g. SmolVLM after Qwen3 replaced it). Such a model has
no row left in the list to delete it from, so without this its weights would stay
on disk for good. Only entries whose URL parses as `{org}/{repo}/resolve/…` are
touched.

## A full disk

There is no pre-download fit check. The browser aborts a Cache API write that
would exceed the quota, and `describeLoadFailure()` in
[`useModels.js`](../src/features/models/hooks/useModels.js) turns it into a
message that names the fix. The `QuotaExceededError` is checked by `name`, and by
message text because transformers.js re-wraps some failures as a plain `Error`.

## Persistence

A non-persisted origin can have its storage evicted under disk pressure — losing a
1.5 GB download and every saved conversation. `requestPersistence()` calls
`navigator.storage.persist()`, and `useModelSetup` calls it via `loadFromComposer` **before**
the first download rather than warning about its absence afterwards.

Chromium decides silently from engagement heuristics and never prompts. Firefox
may prompt, and grants persisted origins a larger quota — which is why
`useStorage.requestPersist` re-reads the figures after the grant.

`isPersisted()` exists as a wrapper for one reason:

```js
// Wrong — `.catch` on undefined throws where the method is missing:
navigator.storage.persisted?.().catch(() => false);
```

The optional call is awaited before anything is chained onto its result.

## When the cache is re-read

`readStorage()` is never polled. It runs on:

1. **Mount** — once, in `useStorage`.
2. **A download finishing or failing** — keyed on `loadedModelIds` and
   `attemptError` in `useModelSetup`.
3. **Deleting a model.**
4. **A persistence grant.**

## Known limitations

- `cachedModelIds` cannot distinguish a complete download from a partial one.
- Nothing reports resident GPU memory, which is the real ceiling once more than
  one model has been loaded in a session.
