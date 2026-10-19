import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const EPSILON = 8;

/**
 * A scroll container that says so, while there is still something below.
 *
 * A sheet clips its content at a hard edge with no scrollbar — the bar is
 * hidden, and a touch device would not have drawn a resting one anyway — so
 * nothing distinguishes "this is the end" from "this is where I stopped
 * showing you". The button is the missing signal, and it also does the
 * scrolling, since a control that only points is a control that has to be
 * understood before it is useful.
 */
export function ScrollNudge({ label, className, children }) {
  const viewport = useRef(null);
  const [more, setMore] = useState(false);

  const measure = useCallback(() => {
    const node = viewport.current;
    if (!node) return;
    setMore(node.scrollHeight - node.scrollTop - node.clientHeight > EPSILON);
  }, []);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return undefined;

    // ResizeObserver fires once on observe, which is what performs the first
    // measurement — doing it in the effect body would be a synchronous setState
    // during layout, and would miss content that arrives later anyway.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    node.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', measure);
    };
  }, [measure]);

  const advance = () => {
    const node = viewport.current;
    if (!node) return;
    // Not a full page: leaving a slice of the previous screen visible is what
    // tells the reader the two are continuous. Clamped to the real end, so the
    // last press lands exactly on the bottom rather than asking for a position
    // past it.
    const end = node.scrollHeight - node.clientHeight;
    const top = Math.min(node.scrollTop + node.clientHeight * 0.8, end);
    node.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewport}
        className={cn('scrollbar-none min-h-0 flex-1 overflow-y-auto', className)}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={advance}
        // The button hangs below the scroll container's edge, so focusing it
        // makes the browser scroll it into view — dragging the panel past its
        // own end and opening a gap under the content. It does not need focus
        // to be pressed; keyboard users still reach it by Tab, which scrolls
        // nothing because the panel is already where Tab left it.
        onPointerDown={(event) => event.preventDefault()}
        aria-label={label}
        aria-hidden={!more}
        tabIndex={more ? 0 : -1}
        className={cn(
          // Half below the sheet's edge, so it reads as attached to the panel
          // rather than as one more thing inside it.
          // Half below the panel's edge still, so the overlap holds as it grows.
          'bg-secondary/70 text-foreground/80 border-border/70 absolute -bottom-5 left-1/2 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full border shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)] backdrop-blur-sm',
          'transition-opacity duration-150 hover:bg-secondary hover:text-foreground',
          more ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <ChevronDown aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
