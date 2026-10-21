# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Local-first LLM chat client (React 19 + Vite 8, plain JS/JSX, no TypeScript). Two backends shown to the user as one model list:

- **WebGPU** — models run in the browser via `@huggingface/transformers` (catalogue in `src/services/localModels.js`).
- **Endpoint** — any OpenAI-compatible server (LM Studio, llama.cpp, vLLM), called via the Responses API (`POST {baseURL}/responses`).

No backend of our own. Conversations live in IndexedDB; model weights in the Cache API. UI is in English and Portuguese (pt-PT).

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
```

Tests use Vitest, co-located as `*.test.js`. `src/state/conversation.test.js` covers the reducer (all actions, stale-request guards, deep-frozen inputs). CI (`.github/workflows`) runs `npm ci → lint → format:check → test → build` on every PR.

Env (`.env.example`, machine values in `.env.local`): `VITE_API_BASE_URL` is an optional default endpoint. Endpoint resolution: `localStorage` → `VITE_API_BASE_URL` → `http://localhost:1234/v1` in dev → `''` (endpoint provider disabled). There is no dev proxy, so the server must allow CORS in every mode.

## Architecture

```
src/App.jsx        composition root: calls every hook, lays out components (large, ~580 lines)
src/state/         conversation reducer (pure) + useConversation (owns the useReducer)
src/features/<x>/  components/ + hooks/ per feature (chat, models, sessions, settings, layout, onboarding)
src/services/      browser/network I/O: providers facade, openai adapter, llm (WebGPU), sessionStore (IndexedDB), modelCache
src/i18n/          en.js (source language) + pt.js, LocaleProvider, useT()
src/lib/           framework-free helpers and generic hooks
src/components/ui/ and src/components/assistant-ui/   shadcn / assistant-ui generated components (eslint-ignored)
```

Imports across top-level folders use the `@/` alias (`vite.config.js`, mirrored in `jsconfig.json`). `state/` and `services/` must not import from `features/`. The docs also say features must not import from each other; that rule is currently broken in a few places (e.g. `chat` → `models`, `layout` → `chat`), so don't treat it as enforced, but avoid adding new cross-feature imports.

### Conversation flow

- `state/conversation.js` reducer actions: `SEND_START`, `TOKEN`, `REPLY`, `FAIL`, `CANCEL`, `LOAD_SESSION`, `NEW_SESSION`.
- **`activeRequestId`** decides ownership: `TOKEN`/`REPLY`/`FAIL` carry a `requestId` and are ignored unless it matches. That is how a reply arriving after a session switch gets dropped.
- **Cancellation** is separate: `useSession` aborts its `AbortController` whenever `activeRequestId` becomes `null`. The WebGPU path resolves with partial output on interrupt, so `llm.js` must call `signal.throwIfAborted()` afterwards. Switching sessions mid-reply (`useSessions.openSession`, decided by the pure `abandonedMessages`) also drops the unanswered user turn from storage, unless it is the chat's first turn; Stop keeps it.
- **`dirty`** controls persistence: only dirty conversations are written, so opening a chat doesn't bump `updatedAt`. Writes happen in effects, never during render.
- `useSession.send` builds the outgoing `messages` from the current render's state, because the dispatch isn't visible until the next render.
- `features/chat/hooks/useAssistantRuntime.js` adapts the reducer to assistant-ui via `useExternalStoreRuntime`, appending a synthetic `__streaming__` message while generating.
- The full history is sent on every request. Don't reintroduce `previous_response_id`: it broke on reload, session switch, and endpoint change.

### Providers and lazy loading

- `services/providers.js` is the only entry point: `getModels(baseURL)`, `generate(...)`, `modelLoader(...)`, `unloadModels()`. Callers never branch on backend. Provider ids are the strings `'Web-GPU'` and `'LM-Studio'`.
- `services/llm.js` (and so `@huggingface/transformers`, ~23 MB of WASM) must only be reached through `await import('./llm')`. Anything needed just to _list_ models or read cache state (`localModels.js`, the `transformers-cache` name in `modelCache.js`) is deliberately kept free of transformers imports. Don't add a static import of `llm.js` or transformers anywhere.
- WebGPU models are offered only when `'gpu' in navigator`. The endpoint's models are offered only if `/models` answers within 3 s. An unreachable endpoint returns `endpointError` instead of throwing.
- The HTTP backend doesn't stream: `onToken` fires once with the full reply.
- `llm.js` keeps every loaded model in a module-level `Map` and never disposes one on its own.

### Storage

- `navigator.storage.estimate()` numbers are fuzzed per browser. Use them to warn, never to gate. A `QuotaExceededError` is caught in `features/models/hooks/useModels.js`.
- "Cached" (weights on disk, `storage.cachedModelIds`) is not "loaded" (on GPU, `loadedModelIds`, not persisted). On startup `App.jsx` reloads every cached model (selected first), skipping downloads the user stopped.
- `localStorage` keys use the `ai-chat:` prefix (e.g. `ai-chat:runtime`, `ai-chat:model`). The runtime and model are persisted together on purpose. A restored model id the list no longer offers is cleared after the cache restore (`isStaleSelection`), except an endpoint model while the endpoint is unreachable.

### i18n

Every UI string goes through `useT()` with a key in `src/i18n/en.js`, plus a translation in `pt.js`. Keys are namespaced by where they appear (`panel.*`, `sessions.*`, `welcome.*`), not by their text. A string used in two places gets two keys. Placeholders look like `{name}`.

## Conventions

- Plain JS/JSX until the post-v1 TypeScript migration (ADR-001).
- Prettier: single quotes, trailing commas, width 100, semis. ESLint flat config (react-hooks, react-refresh).
- Generated UI lives in `src/components/ui/` (shadcn, style `radix-mira`) and `src/components/assistant-ui/` (assistant-ui registry). Add components with the `shadcn` CLI per `components.json`; don't hand-edit them beyond small fixes.
- Icons: lucide only (ADR-007).
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
