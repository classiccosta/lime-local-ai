# AI Chat

Local-first LLM chat client. Run models in the browser on WebGPU, or point it at any
OpenAI-compatible server (LM Studio, llama.cpp, vLLM). No backend of its own:
conversations stay in IndexedDB, model weights in the browser cache. English,
Portuguese (pt-PT) and German.

**Live demo:** [lime-zeta-three.vercel.app](https://lime-zeta-three.vercel.app/) (in-browser
models need a WebGPU browser, e.g. recent Chrome or Edge)...

```bash
npm install
npm run dev   # http://localhost:5173
```

The endpoint must allow CORS. See [`docs/architecture.md`](docs/architecture.md) for the
design, [`docs/storage.md`](docs/storage.md) for browser storage, and
[`docs/adr/decisions.md`](docs/adr/decisions.md) for the decisions behind them.

## Roadmap

### v1

- **Two ways to run models:** in your browser with WebGPU (no server, nothing leaves your machine), or via any OpenAI-compatible endpoint (LM Studio, llama.cpp, vLLM).
- **Sessions saved locally:** create, rename and delete conversations; everything stays in your browser (IndexedDB).
- **Streaming replies you can stop** at any time.
- **Clear errors:** model load, endpoint and storage failures are explained in the UI, not swallowed.
- **English, Portuguese (pt-PT) and German.**

Quality: unit-tested state logic; CI runs lint, format, tests and build on every PR.

### Not in v1

- TypeScript migration
- Performance tuning (bundle, model memory)
