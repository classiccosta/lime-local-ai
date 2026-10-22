import { ModelList } from '@/features/models/components/ModelList';
import { ModelPickerSkeleton } from '@/features/models/components/ModelPickerSkeleton';
import { useT } from '@/i18n/context';
import { menuItem } from '@/lib/menu';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';

/**
 * The model list with its status lines, as one unit.
 *
 * Mounted by both the settings dialog and the composer's menu, from the one
 * state object App builds, so the two cannot drift apart again: the same rows,
 * the same spinner, the same download and delete buttons, the same error.
 *
 * Status sits above the list: the catalogue still loading or failed, the
 * cached in-browser models still being restored (the skeleton stands in for
 * their rows, which App leaves out until then), or nothing to list at all.
 */
export function ModelPicker({
  items,
  onPick,
  loading,
  error,
  restored,
  loadingError,
  ariaLabel,
  inComposer = false,
  onOpenSettings,
}) {
  const t = useT();
  // Only an empty list gets a line, and it never says why a provider is
  // missing: the endpoint is the one thing the user can fix from here. The
  // settings dialog has its field right below; the composer links there.
  const empty = items.length === 0;

  return (
    <>
      {loading ? (
        <p className="text-muted-foreground">{t('model.loading')}</p>
      ) : error ? (
        <p className="text-destructive">{t('model.listError')}</p>
      ) : !restored ? (
        <ModelPickerSkeleton />
      ) : (
        empty && (
          <>
            {/* In the popover, inset like the menu item below it. */}
            <p
              className={cn(
                'text-muted-foreground opacity-70',
                inComposer && 'pt-1 pr-1 pl-[0.55rem]',
              )}
            >
              {t(inComposer ? 'composer.noModels' : 'settings.noModels')}
            </p>
            {inComposer && onOpenSettings && (
              <button type="button" onClick={onOpenSettings} className={cn(menuItem, 'text-xs')}>
                <Settings aria-hidden="true" className="size-3.5" />
                {t('composer.openSettings')}
              </button>
            )}
          </>
        )
      )}

      {/* No progress bar: the spinner on the row is the whole report. */}
      <ModelList items={items} onPick={onPick} ariaLabel={ariaLabel} />

      {loadingError && <p className="text-destructive">{loadingError}</p>}
    </>
  );
}
