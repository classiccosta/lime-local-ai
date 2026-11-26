/// <reference types="vite/client" />

// Replaced at build time by Vite's define, from package.json.
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
