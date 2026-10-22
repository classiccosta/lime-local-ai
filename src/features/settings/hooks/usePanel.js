import { useState } from 'react';
import { readPref, writePref } from '@/lib/prefs';

const KEY = 'panel:sessions';

export function usePanel() {
  const [open, setOpen] = useState(() => {
    const stored = readPref(KEY);
    return stored === null || stored === 'true';
  });

  function toggle() {
    setOpen((previous) => {
      const next = !previous;
      writePref(KEY, next);
      return next;
    });
  }

  return { open, toggle };
}
