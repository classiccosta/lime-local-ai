import { useCallback, useState } from 'react';

const KEY = (name) => `ai-chat:panel:${name}`;

export function usePanel(name, defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(KEY(name));
    return stored === null ? defaultOpen : stored === 'true';
  });

  const toggle = useCallback(() => {
    setOpen((previous) => {
      const next = !previous;
      localStorage.setItem(KEY(name), String(next));
      return next;
    });
  }, [name]);

  // Opening on purpose, for a control elsewhere that needs this panel visible —
  // toggling would shut it when it happened to be open already.
  const show = useCallback(() => {
    localStorage.setItem(KEY(name), 'true');
    setOpen(true);
  }, [name]);

  return { open, toggle, show };
}
