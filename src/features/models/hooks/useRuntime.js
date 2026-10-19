import { useState } from 'react';
import { RUNTIMES } from '../runtimes';

const STORAGE_KEY = 'ai-chat:runtime';

// Which backend the model picker is filtered to. Persisted so a refresh returns
// to the runtime that was in use, and so the restored model selection lands in a
// picker that actually lists it. An unrecognised stored value — a runtime that
// has since been removed — falls back rather than leaving the switch on nothing.
export function useRuntime() {
  const [runtimeId, setRuntimeIdState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return RUNTIMES.some((runtime) => runtime.id === stored) ? stored : RUNTIMES[0].id;
  });

  function setRuntimeId(value) {
    localStorage.setItem(STORAGE_KEY, value);
    setRuntimeIdState(value);
  }

  return { runtimeId, setRuntimeId };
}
