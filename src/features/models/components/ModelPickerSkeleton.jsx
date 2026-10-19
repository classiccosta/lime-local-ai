import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/i18n/context';
import { Loader2 } from 'lucide-react';

/**
 * Stand-in for the model picker while cached models are restored on startup.
 *
 * Nothing is downloaded in that phase — the weights are already on disk — so a
 * percentage bar would report a number that means nothing to the reader. The
 * skeleton holds the shape the picker and its info card take, so the panel does
 * not jump when they arrive, and the line above it says what the wait is for:
 * grey blocks alone read as a stall rather than as work in progress.
 */
export function ModelPickerSkeleton() {
  const t = useT();

  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <p role="status" className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Loader2 aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" />
        {t('model.restoring')}
      </p>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-[34px] w-full rounded-sm" />
      </div>
      <Skeleton className="h-[122px] w-full rounded-lg" />
    </div>
  );
}
