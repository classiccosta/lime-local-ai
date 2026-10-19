import { useT } from '@/i18n/context';
import { X } from 'lucide-react';

/**
 * @param value  aggregate percentage for the whole model, or null before the
 *               first figure arrives
 */
export function ProgressBar({ value, status, onCancel }) {
  const t = useT();
  if (status !== 'loading' || value == null) return null;

  const percent = Math.round(value);
  // The download finishing is not the model being ready: the graphs still have
  // to compile and upload to the GPU, which is seconds of a full bar. Saying so
  // beats a bar that looks stuck.
  const preparing = percent >= 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span>{preparing ? t('progress.preparing') : t('progress.loading')}</span>
        <div className="flex items-center gap-1.5">
          <span>{percent}%</span>
          {/* Sits with the percentage rather than below the bar: stopping is a
              correction, not an action the panel should lead with. Small and
              ringed rather than a filled button — destructive enough to read as
              a stop, quiet enough not to compete with the bar it sits on. */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label={t('progress.stop')}
              title={t('progress.stopShort')}
              className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive grid size-3.5 place-items-center rounded-full border border-current transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-2" />
            </button>
          )}
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progress.bar')}
        className="bg-accent h-1.5 overflow-hidden rounded-[3px]"
      >
        {/* Eased rather than snapped: progress arrives in bursts as chunks land,
            and the transition carries the bar between them. */}
        <div
          className="bg-primary h-full rounded-[3px] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
