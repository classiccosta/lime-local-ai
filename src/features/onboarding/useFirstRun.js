import { useCallback, useState } from 'react';
import { markOnboarded, readPristine } from './firstRun';

/**
 * Whether to show the first-run setup, and how to close it.
 *
 * Judged on stored preferences alone. Cached weights were tried as a second
 * signal and were wrong twice over: they are a byproduct rather than a choice,
 * so a browser whose settings have been cleared genuinely has no runtime
 * preference however many models sit on its disk — and gating on them made the
 * decision wait for an async storage read that could flip after first paint.
 */
export function useFirstRun() {
  // Read in an initialiser so it happens on the first render, ahead of every
  // effect that writes a preference.
  const [pristine] = useState(readPristine);
  const [answered, setAnswered] = useState(false);

  const complete = useCallback(() => {
    markOnboarded();
    setAnswered(true);
  }, []);

  return { open: pristine && !answered, complete };
}
