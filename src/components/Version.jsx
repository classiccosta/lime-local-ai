import { Mark } from '@/components/Mark';
import { useT } from '@/i18n/context';
import { cn } from '@/lib/utils';

// Vite's define, from package.json — one string rather than a build-time import
// of the whole manifest.
const VERSION = __APP_VERSION__;
const NAME = `Lime v${VERSION}`;
const REPO_URL = 'https://github.com/classiccosta/lime-local-ai';

// lucide 1.x dropped brand icons (ADR-007 keeps lucide the only library), so
// this is its last `github` glyph, inlined with the same stroke attributes.
function GithubIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

/**
 * Product name and version, at the foot of the session sidebar, with a link to
 * the repository on the right.
 *
 * Collapses to the mark alone when the sidebar does: a version string in a 64px
 * rail would be clipped to nothing legible, and the mark already reads at that
 * width.
 */
export function Version({ open }) {
  const t = useT();
  return (
    <div
      className={cn(
        'text-muted-foreground/60 flex shrink-0 items-center gap-1.5 border-t pt-2.5 text-xs',
        open ? 'justify-start' : 'justify-center',
      )}
    >
      <p className="flex min-w-0 items-center gap-1.5" title={NAME}>
        <Mark className="text-xs" />
        {open && <span className="truncate">{NAME}</span>}
      </p>
      {open && (
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('sessions.github')}
          title={t('sessions.github')}
          className={cn(
            'text-muted-foreground ml-auto shrink-0 rounded-md border p-1',
            'hover:text-primary hover:border-primary/50 transition-colors',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
        >
          <GithubIcon className="size-3.5" />
        </a>
      )}
    </div>
  );
}
