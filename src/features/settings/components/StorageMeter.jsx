import { InfoHint } from '@/components/InfoHint';
import { useT } from '@/i18n/context';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fitsInStorage } from '@/services/modelCache';
import { Info } from 'lucide-react';
import { useState } from 'react';

// One budget covering every mechanism, which is the part the card cannot show:
// the Models and Conversations rows read as separate allowances otherwise.
// Itemised rather than described, so the sum is the first thing seen.
//
// The exclusion is worth the line it costs. The bundle ships a 23 MB ONNX
// runtime, which is served from this origin and so lands in the HTTP cache
// rather than the quota — a reader who assumes otherwise cannot make the
// figures add up.
function Explainer() {
  const t = useT();

  return (
    <>
      <p>{t('storage.contains')}</p>
      <ul className="list-disc pl-3.5">
        <li>{t('storage.itemModels')}</li>
        <li>{t('storage.itemConversations')}</li>
        <li>{t('storage.itemSettings')}</li>
      </ul>
      <p className="opacity-70">{t('storage.caveat')}</p>
    </>
  );
}

/**
 * Browser storage headroom, and whether the pending download fits in it.
 *
 * @param storage      the snapshot from `readStorage()`, or null where the
 *                     browser has no `estimate()` at all
 * @param requirement  `{ label, bytes }` for a selected model that is not in the
 *                     cache yet, or null when there is nothing to weigh
 */
export function StorageMeter({ storage, onClear, clearing, requirement }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  if (!storage) return null;

  const { usage, quota, free, models, conversations, hasModelCache, persisted } = storage;
  const percent = quota ? Math.min(100, (usage / quota) * 100) : 0;
  const tight = percent >= 90;

  // Tri-state, though only the false branch is shown: true and null both mean
  // there is nothing the user needs to do.
  const fits = fitsInStorage(free, requirement?.bytes);

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center gap-1.5 justify-between">
        <span className="text-muted-foreground text-xs">{t('storage.label')}</span>
        <InfoHint
          label={t('storage.help')}
          side="left"
          content={<Explainer />}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <Info className="size-3.5" aria-hidden="true" />
        </InfoHint>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('storage.bar')}
        className="bg-accent h-1.5 overflow-hidden rounded-[3px]"
      >
        <div
          className={cn('h-full rounded-[3px]', tight ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* `quota` is the whole slice, so it is labelled as the total it is. What
          the user actually needs before deciding to clear is what is left. */}
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{t('storage.free', { size: formatBytes(free) })}</span>
        <span>{t('storage.of', { size: formatBytes(quota) })}</span>
      </div>

      {models != null && (
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{t('storage.models')}</span>
          <span>{formatBytes(models)}</span>
        </div>
      )}
      {conversations != null && (
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{t('storage.conversations')}</span>
          <span>{formatBytes(conversations)}</span>
        </div>
      )}

      {/* Only the bad news. Confirming that a download fits is the ordinary
          case and says nothing the meter above does not already show.

          A warning, not a gate: the estimate is approximate in every browser and
          Safari raises the quota on demand, so a download refused here might
          well have succeeded — the loader catches the real failure instead. */}
      {fits === false && (
        <p className="text-destructive text-xs leading-normal">
          {t('storage.tooBig', {
            label: requirement.label,
            size: formatBytes(requirement.bytes),
          })}
        </p>
      )}

      {hasModelCache && !persisted && (
        <p className="text-muted-foreground text-xs leading-normal opacity-80 py-3">
          {t('storage.notPersisted')}
        </p>
      )}

      {hasModelCache &&
        (confirming ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onClear();
              }}
              disabled={clearing}
              className="text-destructive focus-visible:ring-ring flex-1 rounded-full border border-current py-1 text-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              {clearing ? t('storage.clearing') : t('storage.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex-1 rounded-full py-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
            >
              {t('storage.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="border-border hover:bg-accent focus-visible:ring-ring rounded-full border py-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
          >
            {t('storage.clear')}
          </button>
        ))}
    </div>
  );
}
