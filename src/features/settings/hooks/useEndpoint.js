import { useState } from 'react';

const STORAGE_KEY = 'ai-chat:endpoint';

// Dev assumes LM Studio on its default port with "Enable CORS" on; the browser
// calls it cross-origin, so without that toggle every request fails. A build has
// no sensible default — a hosted page cannot reach a LAN server — so it starts
// empty and the provider stays off until one is set.
const fallback =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:1234/v1' : '');

export function useEndpoint() {
  const [endpoint, setEndpointState] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? fallback,
  );

  function setEndpoint(value) {
    localStorage.setItem(STORAGE_KEY, value);
    setEndpointState(value);
  }

  return { endpoint, setEndpoint };
}
