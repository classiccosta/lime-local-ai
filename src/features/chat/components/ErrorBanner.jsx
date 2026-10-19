import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const VISIBLE_MS = 3000;
const FADE_MS = 300;

/**
 * The conversation's error, shown for a few seconds and then faded out.
 *
 * Only the banner goes: the error stays in the reducer, and the next send
 * clears it there. App keys this on the reducer's `errorCount`, so every
 * failure mounts a fresh banner — the same message twice in a row is the same
 * string, and could not restart it on its own.
 */
export function ErrorBanner({ message, className }) {
  // 'shown' → 'fading' → 'gone', restarted whenever the message changes.
  const [phase, setPhase] = useState(message ? 'shown' : 'gone');
  const [shownMessage, setShownMessage] = useState(message);

  // Adjusting state during render, React's recommended way to reset it when a
  // prop changes: an effect would paint one frame of the old phase first.
  if (message !== shownMessage) {
    setShownMessage(message);
    setPhase(message ? 'shown' : 'gone');
  }

  useEffect(() => {
    if (phase === 'gone') return undefined;
    const timer = setTimeout(
      () => setPhase(phase === 'shown' ? 'fading' : 'gone'),
      phase === 'shown' ? VISIBLE_MS : FADE_MS,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  if (!message || phase === 'gone') return null;

  // The same 10% red tint as before, mixed into the page colour rather than laid
  // over it: the banner floats above the thread, and a see-through one would
  // show the messages scrolling underneath.
  return (
    <p
      role="alert"
      className={cn(
        'bg-[color-mix(in_oklab,var(--destructive)_10%,var(--background))] text-destructive px-4 py-2 text-sm transition-opacity duration-300 motion-reduce:transition-none',
        phase === 'fading' && 'opacity-0',
        className,
      )}
    >
      {message}
    </p>
  );
}
