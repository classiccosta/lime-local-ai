import { focusRing } from '@/lib/focusRing';
import { cn } from '@/lib/utils';

/**
 * A setting shown as its current value, with a "Change" link to edit it.
 *
 * For settings that are set once and then left alone — the endpoint, the
 * language. A live input for each would make the dialog read as a form to fill
 * in, when almost every visit is to pick a model.
 */
export function SettingValue({ value, changeLabel, onChange }) {
  return (
    <div className="flex h-7 items-center justify-between gap-2">
      <span className="truncate text-xs">{value}</span>
      <button
        type="button"
        onClick={onChange}
        className={cn(
          'text-muted-foreground hover:text-foreground shrink-0 rounded-sm text-xs underline underline-offset-2',
          focusRing,
        )}
      >
        {changeLabel}
      </button>
    </div>
  );
}
