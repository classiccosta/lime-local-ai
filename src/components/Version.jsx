import { Mark } from '@/components/Mark';
import { cn } from '@/lib/utils';

// Vite's define, from package.json — one string rather than a build-time import
// of the whole manifest.
const VERSION = __APP_VERSION__;
const NAME = `Lime v${VERSION}`;

/**
 * Product name and version, at the foot of the session sidebar.
 *
 * Collapses to the mark alone when the sidebar does: a version string in a 64px
 * rail would be clipped to nothing legible, and the mark already reads at that
 * width.
 */
export function Version({ open }) {
  return (
    <p
      className={cn(
        'text-muted-foreground/60 flex shrink-0 items-center gap-1.5 border-t pt-2.5 text-xs',
        open ? 'justify-start' : 'justify-center',
      )}
      title={NAME}
    >
      <Mark className="text-xs" />
      {open && <span className="truncate">{NAME}</span>}
    </p>
  );
}
