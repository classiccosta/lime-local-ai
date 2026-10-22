import { ModelList } from '@/features/models/components/ModelList';
import { ModelPickerSkeleton } from '@/features/models/components/ModelPickerSkeleton';
import { useT } from '@/i18n/context';

/**
 * The model list with its status lines, as one unit.
 *
 * Mounted by both the settings dialog and the composer's menu, from the one
 * state object App builds, so the two cannot drift apart again: the same rows,
 * the same spinner, the same download and delete buttons, the same error.
 *
 * Status sits above the list: the catalogue still loading or failed, the
 * cached in-browser models still being restored (the skeleton stands in for
 * their rows, which App leaves out until then), or no WebGPU at all.
 */
export function ModelPicker({
  items,
  onPick,
  loading,
  error,
  restored,
  noWebgpu,
  loadingError,
  ariaLabel,
  inComposer = false,
}) {
  const t = useT();
  // The settings dialog has the endpoint field right below; the composer has
  // to send the user there. With nothing to list at all, the composer says so
  // first, or the open menu would look broken rather than empty.
  const noWebgpuKey = !inComposer
    ? 'settings.noWebgpu'
    : items.length === 0
      ? 'composer.noModels'
      : 'composer.noWebgpu';

  return (
    <>
      {loading ? (
        <p className="text-muted-foreground">{t('model.loading')}</p>
      ) : error ? (
        <p className="text-destructive">{t('model.listError')}</p>
      ) : !restored ? (
        <ModelPickerSkeleton />
      ) : (
        noWebgpu && <p className="text-muted-foreground opacity-70">{t(noWebgpuKey)}</p>
      )}

      {/* No progress bar: the spinner on the row is the whole report. */}
      <ModelList items={items} onPick={onPick} ariaLabel={ariaLabel} />

      {loadingError && <p className="text-destructive">{loadingError}</p>}
    </>
  );
}
