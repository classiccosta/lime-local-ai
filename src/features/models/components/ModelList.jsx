import { Spinner } from '@/components/Spinner';
import { focusRing } from '@/lib/focusRing';
import { cn } from '@/lib/utils';
import { Check, Download, Trash2 } from 'lucide-react';

const ACTION = cn('rounded-sm p-0.5 disabled:pointer-events-none disabled:opacity-50', focusRing);

/**
 * Every model as a column of rows, for the settings dialog.
 *
 * Rows rather than a dropdown: with both providers on one page the list is the
 * picker, and a closed menu would hide exactly what the page is there to show.
 *
 * Only a row that can be picked as it stands is a button. A model that is not
 * downloaded yet is fetched from its own download icon instead — a whole row
 * that started a download of up to 1.5 GB was too easy to hit by accident.
 *
 * @param items  `{ id, label, icon, iconLabel, active, busy, disabled, dim, pickable,
 *               onDownload, downloadLabel, onDelete, deleteLabel }`;
 *               `icon` is a lucide component
 */
export function ModelList({ items, onPick, ariaLabel }) {
  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-0.5">
      {items.map((item) => {
        const { id, label, icon: Icon, iconLabel, active, busy, disabled, dim } = item;
        const pickable = item.pickable ?? true;
        const content = (
          <>
            {Icon && <Icon role="img" aria-label={iconLabel} className="size-3.5 shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </>
        );
        const rowClass =
          'flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1.5 pl-2.5 text-left';

        return (
          <li
            key={id}
            className={cn(
              'flex items-center rounded-sm',
              pickable && 'hover:bg-primary/20',
              dim && 'text-muted-foreground/60',
              active && 'text-primary',
            )}
          >
            {pickable ? (
              <button
                type="button"
                onClick={() => onPick(id)}
                disabled={disabled}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  rowClass,
                  focusRing,
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {content}
              </button>
            ) : (
              <span className={rowClass}>{content}</span>
            )}

            {/* Siblings of the row button, not inside it: a button cannot hold
                another, and neither action may also pick the model. */}
            <span className="flex shrink-0 items-center gap-1.5 pr-2.5 pl-2">
              {item.onDelete && (
                <button
                  type="button"
                  onClick={item.onDelete}
                  aria-label={item.deleteLabel}
                  className={cn(ACTION, 'text-muted-foreground hover:text-destructive')}
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              )}
              {busy ? (
                <Spinner />
              ) : active ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                item.onDownload && (
                  <button
                    type="button"
                    onClick={item.onDownload}
                    disabled={disabled}
                    aria-label={item.downloadLabel}
                    className={cn(ACTION, 'hover:text-foreground')}
                  >
                    <Download aria-hidden="true" className="size-3.5" />
                  </button>
                )
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
