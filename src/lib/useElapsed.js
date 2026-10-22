import { useEffect, useState } from 'react';
import { nextTickIn } from './formatElapsed';

// Elapsed ms since `startedAt`, re-rendering only when the formatted label can
// change. Derived from the start time rather than counted up, so it doesn't
// drift and survives a remount.
export function useElapsed(startedAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt == null) return;
    let timer;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setNow(Date.now());
          schedule();
        },
        nextTickIn(Date.now() - startedAt),
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [startedAt]);

  return startedAt == null ? 0 : now - startedAt;
}
