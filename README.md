<p>
<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="docs/media/readme/banner-mobile-dark.svg">
  <source media="(max-width: 600px)" srcset="docs/media/readme/banner-mobile-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/banner-dark.svg">
  <img alt="Lime — local AI chat" src="docs/media/readme/banner-light.svg" width="100%">
</picture>
</p>

<p><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/tag-react-dark.svg"><img alt="React 19" src="docs/media/readme/tag-react-light.svg"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/tag-tailwind-dark.svg"><img alt="Tailwind CSS" src="docs/media/readme/tag-tailwind-light.svg"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/tag-indexeddb-dark.svg"><img alt="IndexedDB" src="docs/media/readme/tag-indexeddb-light.svg"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/tag-vitest-dark.svg"><img alt="Vitest" src="docs/media/readme/tag-vitest-light.svg"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/tag-ci-dark.svg"><img alt="CI · Actions" src="docs/media/readme/tag-ci-light.svg"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/tag-cd-dark.svg"><img alt="CD · Vercel" src="docs/media/readme/tag-cd-light.svg"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/tag-i18n-dark.svg"><img alt="English, Portuguese, German" src="docs/media/readme/tag-i18n-light.svg"></picture></p>

A chat client for the language models you run yourself. Point it at any
OpenAI-compatible server (LM Studio, llama.cpp, vLLM) and chat in the browser, with
streaming replies you can stop. No backend of its own: conversations stay in your
browser (IndexedDB). English, Portuguese (pt-PT) and German.

<p><a href="https://lime-zeta-three.vercel.app"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/media/readme/demo-dark.svg"><img alt="Live demo" src="docs/media/readme/demo-light.svg"></picture></a></p>

## Demo

Streaming a reply from LM Studio: _"Explain CORS like you are a nightclub bouncer."_

![Lime streaming a reply from LM Studio](docs/media/lime-demo-cors.gif)

Switching the interface to German, then chatting in German: _"Erklär mir, warum Berliner
Döner besser ist als jeder andere."_

![Switching the UI to German and chatting in German](docs/media/lime-demo-doener-de.gif)

## Try it

**Live:** [lime-zeta-three.vercel.app](https://lime-zeta-three.vercel.app/), with your
own endpoint (below). Lime has no models of its own, so without one the model list is
empty.

### Connect LM Studio

1. In [LM Studio](https://lmstudio.ai), download and load a chat model.
2. Open the **Developer** tab, start the server (default port `1234`) and turn on
   **Enable CORS** in its settings. Without CORS the browser blocks every request.
3. In Lime, open **Settings → Endpoint**, enter `http://localhost:1234/v1` and press
   **Load models**.
4. Pick the model in the composer and send a message.

Chrome or Safari is recommended.

### Run locally

```bash
npm install
npm run dev   # http://localhost:5173, endpoint preset to http://localhost:1234/v1
```

Node 24 (`.nvmrc`). `VITE_API_BASE_URL` in `.env.local` sets a different default endpoint.

## What's in v1

- **Any OpenAI-compatible endpoint**, through the Responses API, with **streaming** replies.
- **Stop** a reply at any time; interrupted questions are kept and marked "Stopped".
- **Sessions saved locally:** conversations are created as you chat, titled from the first
  message, and can be deleted. Nothing leaves your browser except the request to your
  endpoint.
- **Readable errors:** unreachable endpoint, HTTP errors and storage failures are explained
  in the UI, translated, never shown as raw server output.
- **English, Portuguese (pt-PT) and German.**

Quality: unit-tested state and decision logic (Vitest); CI runs lint, format check, tests
and build on every PR; every PR gets a Vercel preview.

## Not in v1

- **In-browser models (WebGPU):** built and paused. The models small enough for a phone
  got basic facts wrong too often to be the first impression
  ([ADR-012](docs/adr/decisions.md)).
- TypeScript migration
- Regenerating or editing a message; showing model reasoning

## Docs

- [`docs/architecture.md`](docs/architecture.md): design, state, providers
- [`docs/storage.md`](docs/storage.md): browser storage
- [`docs/adr/decisions.md`](docs/adr/decisions.md): the decisions behind them
