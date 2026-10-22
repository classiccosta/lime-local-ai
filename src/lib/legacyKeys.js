// Keys earlier versions wrote and nothing reads any more. Left alone they sit in
// every returning visitor's storage for good, so they are cleared on startup.
export const LEGACY_KEYS = [
  'ai-chat:onboarded',
  'ai-chat:panel:config',
  'ai-chat:incomplete-models',
  'ai-chat:runtime',
];

// localStorage throws where site data is blocked; then there is nothing to clear.
export function removeLegacyKeys(storage = globalThis.localStorage) {
  try {
    for (const key of LEGACY_KEYS) storage.removeItem(key);
  } catch {
    /* nothing stored, nothing to clear */
  }
}
