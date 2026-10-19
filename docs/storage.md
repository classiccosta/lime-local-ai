# Browser storage

How the app measures the disk it is using, what the Storage meter in the settings
panel actually reports, and why every number on it is approximate.

- **Service:** [`src/services/modelCache.js`](../src/services/modelCache.js)
- **Hook:** [`src/features/settings/hooks/useStorage.js`](../src/features/settings/hooks/useStorage.js)
- **Component:** [`src/features/settings/components/StorageMeter.jsx`](../src/features/settings/components/StorageMeter.jsx)

---

## What is stored, and where

Two mechanisms, with very different footprints:

| What                | Where                             | Order of magnitude   |
| ------------------- | --------------------------------- | -------------------- |
| Model weights       | Cache API, `transformers-cache`   | 390 MB – 1.5 GB each |
| Conversations       | IndexedDB, `sessions` store       | kilobytes            |

The cache name is `transformers-cache` because that is `env.cacheKey` in
transformers.js. It is hard-coded rather than imported so that reading a string
does not pull the ~23 MB runtime into the initial bundle.

Everything else the app keeps — the endpoint, the panel open/closed states — is a
handful of bytes in localStorage and never shows up in the meter's rounding.

## Disk is not memory

The meter measures **disk**. It says nothing about RAM or VRAM, and the two are
easy to conflate because the panel shows both kinds of figure:

- The `VRAM est.` row in [`ModelInfo.jsx`](../src/features/models/components/ModelInfo.jsx)
  is a static `downloadBytes × 1.5`, for the selected model only.
- Models are loaded with `device: 'webgpu'`, so the weights live in GPU buffers.
  They are not on the JS heap and `performance.memory` would not see them even
  where it exists.
- [`llm.js`](../src/services/llm.js) keeps every model loaded this session in a
  module-level `Map` and never disposes one. Load both catalogue entries and both
  stay resident. Nothing in the UI reports that.

No browser API exposes live VRAM usage. `navigator.deviceMemory` (Chromium only)
gives coarse system RAM, and a WebGPU adapter's `limits.maxBufferSize` gives a
ceiling, not a reading. Neither is used here.

## Loaded is not cached

Two different questions, answered by two different pieces of state, and the panel
shows both:

| Question                          | State                                | Survives reload |
| --------------------------------- | ------------------------------------ | --------------- |
| Are the weights on disk?          | `storage.cachedModelIds`             | yes             |
| Is the model ready to generate?   | `useModels().loadedModelIds`         | no              |

`loadedModelIds` mirrors the module-level `Map` in `llm.js`. A model cached on
disk still has to be read, compiled and uploaded to the GPU after a reload, so it
is *cached* but not *loaded* until something loads it.

The distinction drives three pieces of UI:

- The Load Model button is removed once the selected model is in
  `loadedModelIds` — it has nothing left to do. The info card reports the state
  instead, with a full-width `Loaded` strip along its top edge.
- Loaded models get a `✓` after their name in the dropdown. A native `<option>`
  renders text and nothing else, so the mark is part of the label string rather
  than an icon beside it.
- Switching the runtime away and back restores the most recently loaded model
  (`lastLoadedModelId`) instead of emptying the picker, so its info card and
  selection survive the trip.

`loadingStatus` describes the most recent load *attempt* and nothing more. It
cannot answer "is this model ready" once the selection has moved on, which is why
`isReady` and the button both consult `loadedModelIds` instead. Changing the
selection resets `loadingStatus`, the progress value and any load error, so a new
model never inherits the previous one's progress bar.

`storage.cachedModelIds` is what suppresses the fit warning: a model already on
disk costs no further space, so there is nothing to weigh.

### Restoring the state across a refresh

Three pieces of state cooperate so a reload comes back where it left off:

| State                | Where                       | Restored by                    |
| -------------------- | --------------------------- | ------------------------------ |
| `runtimeId`          | `ai-chat:runtime`           | `useRuntime`                   |
| `selectedModelId`    | `ai-chat:model`             | `useModels`                    |
| `loadedModelIds`     | not persisted               | re-loading the cached model    |

The runtime is persisted alongside the model for a reason: restoring a model id
into a picker filtered to the *other* runtime would leave the select showing
nothing. Writing both together keeps them consistent.

`loadedModelIds` is deliberately not persisted. Restoring it would paint a
`Loaded` strip over a model that `generate()` would reject with "Model is not
loaded yet." Instead `App.jsx` re-establishes the fact: an effect loads the
restored model on startup when its weights are already in `cachedModelIds`.
Reading from the cache costs GPU memory and compile time but no network, and a
`useRef` guard stops a later storage refresh from firing it again.

The cost is real and worth stating: every refresh with a cached model selected
spends that model's VRAM whether or not the user goes on to chat. The optimism in
`cachedModelIds` also applies here — an interrupted download looks cached, so
startup resumes fetching the missing files rather than loading instantly.

---

## Reading the figures

`readStorage()` is built on `navigator.storage.estimate()`, the only
storage-accounting API present in Chrome, Edge, Firefox and Safari:

```js
const { usage = 0, quota = 0, usageDetails } = await navigator.storage.estimate();
```

- **`usage`** — bytes this origin currently holds, across all mechanisms.
- **`quota`** — the origin's total budget. **Not free space, and not a
  reservation.**
- **`free`** — derived as `max(0, quota - usage)`. This is what the meter labels
  as free; `quota` is labelled as the total it is.

The component renders `usage / quota` as a bar and turns it red past 90%.

### Every browser fuzzes this

| Browser  | Behaviour                                                              |
| -------- | ---------------------------------------------------------------------- |
| Chromium | Quota is a share of **free disk**, so it shrinks as the disk fills      |
| Firefox  | Rounds `usage` into blocks to frustrate fingerprinting                  |
| Safari   | Starts with a small quota and raises it on demand as the origin grows   |

Consequences the code has to live with: the same cache reports different sizes in
different browsers; headroom is a snapshot that can be wrong by the time the
download finishes; and a pessimistic reading in Safari may describe a download
that would in fact have succeeded.

**The figures are good enough to warn with and not good enough to gate on.** That
is the reason the Load Model button is never disabled by the fit check.

## The per-mechanism breakdown

`estimate()` can return a `usageDetails` object splitting usage by mechanism, but
that field is Chromium-only. Where it is missing, `readCache()` sums the model
cache from its entries' `Content-Length` headers instead:

```js
const cache = await caches.open(MODEL_CACHE_NAME);
const requests = await cache.keys();       // one call
const response = await cache.match(request); // headers only, no body read
```

Reading headers does not consume the response body, so this stays cheap. If any
entry lacks `Content-Length` the sum would silently under-report, so the size is
reported as `null` and the row hides itself — preferable to deserialising
gigabytes of blobs to find out.

There is no portable way to size an IndexedDB database, so the **Conversations**
row remains Chromium-only and is hidden elsewhere.

The same `keys()` pass yields `cachedModelIds`, by substring-matching each
catalogue id against the request URLs (transformers.js keys entries by their
Hugging Face URL, which embeds the repo id). An interrupted download leaves some
files behind, so this means *has files for*, not *complete* — the loader
re-fetches whatever is missing either way.

## Will the next download fit?

Prediction and detection, because neither is sufficient alone.

**Predict** — `fitsInStorage(free, needed)` in `modelCache.js`:

```js
const HEADROOM = 1.15;
return free >= needed * HEADROOM;
```

The 15% covers the Cache API holding a response while it writes, and the quota
shrinking mid-download as the disk fills. The function is tri-state: `null` means
*cannot say* (no estimate, or no pending download), which the component renders as
no message at all rather than as reassurance.

`App.jsx` supplies the requirement only for a model that is not already in
`cachedModelIds`, since a cached model costs no further space.

**Detect** — `describeLoadFailure()` in
[`useModels.js`](../src/features/models/hooks/useModels.js). The browser aborts a
Cache API write that would exceed the quota; the `QuotaExceededError` is checked
by `name`, and by message text because transformers.js re-wraps some failures as a
plain `Error`. The user gets a message that names the fix instead of a raw
exception.

## Persistence

A non-persisted origin can have its storage evicted under disk pressure — losing a
1.5 GB download and every saved conversation. `requestPersistence()` calls
`navigator.storage.persist()`, and `App.jsx` calls it via `startLoad` **before**
the first download rather than warning about its absence afterwards.

Chromium decides silently from engagement heuristics and never prompts. Firefox
may prompt, and grants persisted origins a larger quota — which is why
`useStorage.requestPersist` re-reads the figures after the grant.

`isPersisted()` exists as a wrapper for one reason:

```js
// Wrong — `.catch` on undefined throws where the method is missing:
navigator.storage.persisted?.().catch(() => false)
```

The optional call is awaited before anything is chained onto its result.

## When the figures are re-read

`readStorage()` is never polled. It runs on:

1. **Mount** — once, in `useStorage`.
2. **Settings panel opening** — the only place the meter is shown, so this is also
   what picks up conversations written to IndexedDB since the last read.
3. **A download finishing or failing** — a failure may have filled the quota on
   the way to giving up.
4. **Clearing the model cache.**
5. **A persistence grant** — the quota may have changed with it.

## Known limitations

- `formatBytes` renders two decimal places at GB scale, which implies more
  precision than Firefox's block-rounded `usage` actually carries.
- `cachedModelIds` cannot distinguish a complete download from a partial one, so
  the fit check errs towards optimism for a model that was interrupted.
- The header-sum fallback assumes the model cache holds nothing but this app's
  weights. That holds today because the app puts nothing else in the Cache API.
- Nothing reports resident GPU memory, which is the real ceiling once more than
  one model has been loaded in a session.
