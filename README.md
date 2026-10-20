# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Roadmap

### v1

- **Two ways to run models:** in your browser with WebGPU (no server, nothing leaves your machine), or via any OpenAI-compatible endpoint (LM Studio, Ollama, OpenAI).
- **Sessions saved locally:** create, rename and delete conversations; everything stays in your browser (IndexedDB).
- **Streaming replies you can stop** at any time.
- **Clear errors:** model load, endpoint and storage failures are explained in the UI, not swallowed.
- **English and Portuguese (pt-PT).**

Quality: unit-tested state logic; CI runs lint, format, tests and build on every PR.

### Not in v1

- TypeScript migration
- Performance tuning (bundle, model memory)
