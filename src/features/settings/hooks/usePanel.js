import { useState } from 'react';

const KEY = 'ai-chat:panel:sessions';

export function usePanel() {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(KEY);
    return stored === null || stored === 'true';
  });

  function toggle() {
    setOpen((previous) => {
      const next = !previous;
      localStorage.setItem(KEY, String(next));
      return next;
    });
  }

  return { open, toggle };
}
