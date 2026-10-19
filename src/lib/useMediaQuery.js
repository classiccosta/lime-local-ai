import { useCallback, useSyncExternalStore } from 'react';

// Tailwind's `md`. Below it the two side panels stop being panels: there is not
// enough width for a 390px thread and a 256px rail beside it.
const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Whether a media query currently matches.
 *
 * A hook rather than `md:` classes because the panels do not merely restyle
 * across the breakpoint — they change container, from an <aside> in the layout
 * to a dialog over it. Rendering both and hiding one would mount every session
 * row and every setting twice.
 *
 * Read through `useSyncExternalStore`: the match is state owned by the browser,
 * not by React, and subscribing to it this way keeps the first render and the
 * subscription consistent without a setState in an effect.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia?.(query);
      if (!list) return () => {};
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia?.(query).matches ?? false, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}

/**
 * Whether the device has no hovering pointer.
 *
 * Separate from `useIsMobile`: width says how much room there is, this says
 * whether a control can explain itself on approach or only on contact. A tablet
 * is wide and cannot hover; a small window on a laptop is narrow and can.
 */
export function useIsTouch() {
  return useMediaQuery('(hover: none)');
}
