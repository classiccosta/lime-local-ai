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
}) {
  const t = useT();

  return (
    <>
      {loading ? (
        <p className="text-muted-foreground">{t('model.loading')}</p>
      ) : error ? (
        <p className="text-destructive">{t('model.listError', { error })}</p>
      ) : !restored ? (
        <ModelPickerSkeleton />
      ) : (
        noWebgpu && <p className="text-muted-foreground opacity-70">{t('settings.noWebgpu')}</p>
      )}

      {/* No progress bar: the spinner on the row is the whole report. */}
      <ModelList items={items} onPick={onPick} ariaLabel={ariaLabel} />

      {loadingError && <p className="text-destructive">{loadingError}</p>}
    </>
  );
}
