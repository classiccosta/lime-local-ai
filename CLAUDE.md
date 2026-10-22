# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Local-first LLM chat client (React 19 + Vite 8, plain JS/JSX, no TypeScript). Two backends shown to the user as one model list:

- **WebGPU** — models run in the browser via `@huggingface/transformers` (catalogue in `src/services/localModels.js`). **Paused for v1 (ADR-012):** `WEBGPU_ENABLED = false` in `localModels.js` makes the app behave as in a browser without WebGPU. Keep the code working (tests, lint) but don't build on it; bl-07 decides at v1.1 whether it returns or is removed.
- **Endpoint** — any OpenAI-compatible server (LM Studio, llama.cpp, vLLM), called via the Responses API (`POST {baseURL}/responses`).

No backend of our own. Conversations live in IndexedDB; model weights in the Cache API. UI is in English, Portuguese (pt-PT) and German.

`docs/architecture.md` and `docs/storage.md` are the detailed design docs — read them before touching state, providers, or storage. `docs/adr/decisions.md` records why things are the way they are (JS until v1, assistant-ui, git workflow, lucide).

## Commands

```bash
npm run dev       # Vite dev server (port 5173)
npm run build     # production build to dist/
npm run lint      # eslint .
npm run preview   # serve the build
npm test          # vitest run (once)
npm run test:watch
npm run format    # prettier --write . (singleQuote, trailingComma all, printWidth 100)
npm run format:check
npm run knip      # unused files/exports/deps (generated ui/ and assistant-ui/ ignored)
```

Tests use Vitest, co-located as `*.test.js`. `src/state/conversation.test.js` covers the reducer (all actions, stale-request guards, deep-frozen inputs); the other pure decisions have their own tests next to them (`displayMessages`, `sendFailure`, `endpointFailure`, `selection`, `services/sse`), and `i18n/locales.test.js` checks every language has exactly `en.js`'s keys. Logic with a rule worth testing goes in a pure function next to its hook. CI (`.github/workflows`) runs `npm ci → lint → format:check → test → build` on every PR.

Env (`.env.example`, machine values in `.env.local`): `VITE_API_BASE_URL` is an optional default endpoint. Endpoint resolution: `localStorage` → `VITE_API_BASE_URL` → `http://localhost:1234/v1` in dev → `''` (endpoint provider disabled). There is no dev proxy, so the server must allow CORS in every mode.

## Architecture

```
src/App.jsx        composition root: calls every hook, lays out components
src/state/         conversation reducer (pure) + useConversation (owns the useReducer) + composerModels context
src/features/<x>/  components/ + hooks/ per feature (chat, models, sessions, settings, layout)
src/services/      browser/network I/O: providers facade, openai adapter, llm (WebGPU), sessionStore (IndexedDB), modelCache
src/i18n/          en.js (source language) + pt.js, LocaleProvider, useT()
src/lib/           framework-free helpers and generic hooks
src/components/ui/ and src/components/assistant-ui/   shadcn / assistant-ui generated components (eslint-ignored)
```

Imports across top-level folders use the `@/` alias (`vite.config.js`, mirrored in `jsconfig.json`). `state/` and `services/` must not import from `features/`. Features must not import from each other: shared state goes in `state/`, shared helpers in `lib/`.

### Conversation flow

- `state/conversation.js` reducer actions: `SEND_START`, `TOKEN`, `REPLY`, `FAIL`, `CANCEL`, `LOAD_SESSION`, `NEW_SESSION`.
- **`activeRequestId`** decides ownership: `TOKEN`/`REPLY`/`FAIL` carry a `requestId` and are ignored unless it matches. That is how a reply arriving after a session switch gets dropped.
- **Cancellation** is separate: `useSession` aborts its `AbortController` whenever `activeRequestId` becomes `null`. The WebGPU path resolves with partial output on interrupt, so `llm.js` must call `signal.throwIfAborted()` afterwards. Switching sessions mid-reply (`useSessions.openSession`) dispatches `CANCEL`, so it behaves like Stop: the user turn stays and shows as stopped.
- **`dirty`** controls persistence: only dirty conversations are written, so opening a chat doesn't bump `updatedAt`. Writes happen in effects, never during render.
- `useSession.send` builds the outgoing `messages` from the current render's state, because the dispatch isn't visible until the next render.
- `features/chat/hooks/useAssistantRuntime.js` adapts the reducer to assistant-ui via `useExternalStoreRuntime`, appending a synthetic `__streaming__` message while generating and a `__stopped__:<id>` marker after every unanswered user turn (`features/chat/displayMessages.js`; derived, not stored). The streaming message has no parts until the first token: assistant-ui renders its `indicator` ("Thinking…") only when the last part isn't text, and an empty text part counts as text.
- The full history is sent on every request. Don't reintroduce `previous_response_id`: it broke on reload, session switch, and endpoint change.

### Providers and lazy loading

- `services/providers.js` is the only entry point: `getModels(baseURL)`, `generate(...)`, `modelLoader(...)`, `unloadModel(id)`. Callers never branch on backend. Provider ids are the strings `'webgpu'` and `'endpoint'`.
- `services/llm.js` (and so `@huggingface/transformers`, ~23 MB of WASM) must only be reached through `await import('./llm')`. Anything needed just to _list_ models or read cache state (`localModels.js`, the `transformers-cache` name in `modelCache.js`) is deliberately kept free of transformers imports. Don't add a static import of `llm.js` or transformers anywhere.
- WebGPU models are offered only when `WEBGPU_ENABLED` and `'gpu' in navigator`. The endpoint's models are offered only if `/models` answers within 3 s, minus embedding models (`isChatModel`). An unreachable endpoint returns `endpointError` instead of throwing.
- `llm.js` keeps every loaded model in a module-level `Map` and disposes one only when the user deletes it.

### Storage

- `navigator.storage.estimate()` numbers are fuzzed per browser. Use them to warn, never to gate. A `QuotaExceededError` is caught in `features/models/hooks/useModels.js`.
- "Cached" (weights on disk, `storage.cachedModelIds`) is not "loaded" (on GPU, `loadedModelIds`, not persisted). On startup `useModelSetup` reloads every cached model (selected first).
- `localStorage` keys use the `ai-chat:` prefix (e.g. `ai-chat:model`, `ai-chat:locale`). Read and write them only through `lib/prefs.js` (`readPref`/`writePref`), which survives storage that throws (Safari private mode, blocked site data). A key nothing reads any more goes in its `LEGACY_KEYS`, cleared on startup by `dropLegacyPrefs()`. A restored model id the list no longer offers is cleared after the cache restore and on every list change (`isStaleSelection`), except an endpoint model while the endpoint is unreachable. A stale clear re-arms the once-only auto-select.

### i18n

Every UI string goes through `useT()` with a key in `src/i18n/en.js`, plus a translation in `pt.js` and `de.js` (the parity test fails otherwise). Keys are namespaced by where they appear (`panel.*`, `sessions.*`, `thread.*`), not by their text. A string used in two places gets two keys. Placeholders look like `{name}`.

## Conventions

- Plain JS/JSX until the post-v1 TypeScript migration (ADR-001).
- Prettier: single quotes, trailing commas, width 100, semis. ESLint flat config (react-hooks, react-refresh).
- Generated UI lives in `src/components/ui/` (shadcn, style `radix-mira`) and `src/components/assistant-ui/` (assistant-ui registry). Add components with the `shadcn` CLI per `components.json`; don't hand-edit them beyond small fixes.
- Icons: lucide only (ADR-007).
- Menus and popovers share one look: `menuContent` / `menuItem` from `src/lib/menu.js`. Don't restyle a menu inline.
- Errors shown to the user go through a pure `describe…Failure(error, t)` (`features/chat/sendFailure.js`, `features/models/endpointFailure.js`, the load one in `useModels`): translated text only, never `error.message` or a response body; the original goes to `console.error`.
- Following a streaming reply is `src/lib/followBottom.js`, not assistant-ui's `autoScroll` (set to `false` on the viewport): iOS Safari's post-scroll position jitter made assistant-ui stop following mid-reply. Keep both if `thread.jsx` is regenerated.
- zustand is only used by generated code (`assistant-ui/attachment.jsx`). Don't use it for app state; that lives in the reducer and feature hooks.
- React Compiler is enabled (babel preset in `vite.config.js`): no manual `useMemo`/`useCallback` unless profiled.
- Tailwind v4 via `@tailwindcss/vite`; theme tokens are in `src/index.css`.
- `__APP_VERSION__` is injected from `package.json` at build time.
- Comments explain _why_ (constraints, browser quirks, past bugs), never _what_. Match that density and style.

### Tests

Test density follows risk: the reducer densely (inputs deep-frozen), hooks and services on their critical paths, UI checked manually (one smoke test planned).

### Git

Per ADR-006: `main` always deployable; one ticket → one branch (`type/short-name`) → one PR → squash merge → delete branch. Conventional commits (`feat|fix|test|ci|chore|style|refactor|docs`); check the squash title before merging; CI green before merge.

### Definition of Done

- Lint + format + tests + build pass · strings in en + pt · docs updated if behaviour changed · checked on mobile + desktop.

## Deployment constraints

- Deployed on Vercel through its Git integration: `main` deploys to production, every PR gets a preview URL. No deploy workflow in `.github/`; CI gates the merge. Vercel builds with `engines.node` (kept in step with `.nvmrc`). `vercel.json` sets COOP `same-origin` and COEP `credentialless`, which the WebGPU/WASM runtime needs; keep them.
- An HTTPS page can't reach an HTTP LAN server, and the endpoint must allow CORS. Realistic use is running the app locally.
- `crypto.randomUUID()` (used for all ids) needs a secure context: `localhost` or HTTPS.
