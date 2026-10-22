import { useT } from '@/i18n/context';
import { cn } from '@/lib/utils';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function EndpointField({ endpoint, onLoad, fetching, error, modelCount, focusSignal }) {
  const t = useT();
  const [draft, setDraft] = useState(endpoint ?? '');
  const input = useRef(null);

  // Sent here from the composer, which opens the panel on this tab. A counter
  // rather than a boolean, so asking twice in a row focuses twice.
  //
  // Deferred a frame: on mobile this field arrives inside a dialog, and Radix
  // moves focus to the dialog on open. Focusing in the effect body would put
  // the cursor here and have it taken away again a moment later.
  useEffect(() => {
    if (!focusSignal) return undefined;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusSignal]);
  const trimmed = draft.trim();

  const submit = (event) => {
    event.preventDefault();
    if (!trimmed || fetching) return;
    onLoad(trimmed);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {/* The outcome goes under the field and wraps: the width never changes,
          the height grows only when there's something to say. */}
      <label htmlFor="endpoint-input" className="text-muted-foreground text-xs">
        {t('endpoint.label')}
      </label>

      {/* Load sits at the end of the field rather than under it: one row,
          28px tall like the plain value it replaces. Enter submits too. */}
      <div className="flex items-center gap-1.5">
        <input
          id="endpoint-input"
          ref={input}
          // Not type="url": its validation blocks submit on anything short of a
          // full absolute URL, and the request itself reports a bad address better.
          type="text"
          inputMode="url"
          spellCheck="false"
          autoComplete="off"
          placeholder="http://localhost:11434"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="bg-background border-border placeholder:text-muted-foreground/60 focus-visible:ring-ring h-7 min-w-0 flex-1 rounded-sm border px-3 text-xs focus-visible:ring-2 focus-visible:outline-none"
        />

        <button
          type="submit"
          disabled={!trimmed || fetching}
          aria-label={fetching ? t('endpoint.submitting') : t('endpoint.submit')}
          title={fetching ? t('endpoint.submitting') : t('endpoint.submit')}
          className="bg-primary text-primary-foreground focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          {fetching ? (
            <Loader2
              aria-hidden="true"
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <ArrowRight aria-hidden="true" className="size-3.5" />
          )}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-xs [overflow-wrap:anywhere]">
          {error}
        </p>
      ) : (
        !fetching &&
        endpoint && (
          // An endpoint that answers with nothing to chat to is as much a
          // dead end as one that does not answer, so it reads in red too.
          <p
            role={modelCount === 0 ? 'alert' : undefined}
            className={cn(
              'text-xs [overflow-wrap:anywhere]',
              modelCount === 0 ? 'text-destructive' : 'text-muted-foreground opacity-70',
            )}
          >
            {modelCount === 0
              ? t('endpoint.none')
              : t(modelCount === 1 ? 'endpoint.count_one' : 'endpoint.count_other', {
                  count: modelCount,
                })}
          </p>
        )
      )}
    </form>
  );
}
