import { useT } from '@/i18n/context';
import { cn } from '@/lib/utils';
import { PanelLeft, PanelRight, X } from 'lucide-react';

// `labelKey` rather than a label: the show/hide sentence is built around the
// section name, and a language that inflects it needs the key, not the word.
// `sheet` marks the mobile container, where this row is a dialog header rather
// than a rail control: there is no narrow state to collapse into, only a sheet
// to dismiss. A panel-collapse chevron would be describing a gesture the
// viewport no longer offers.
export function PanelToggle({ icon: Icon, labelKey, side, open, onToggle, sheet }) {
  const t = useT();
  const isRight = side === 'right';
  const Panel = sheet ? X : isRight ? PanelRight : PanelLeft;
  // `t` returns the key itself when it knows nothing better, and undefined when
  // there was no key to look up. Neither is worth crashing the whole tree over.
  const label = t(labelKey) ?? '';
  const action = t(sheet ? 'panel.close' : open ? 'panel.hide' : 'panel.show', {
    label: label.toLowerCase(),
  });

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={action}
      title={action}
      className={cn(
        'hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-md transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        // Collapsed the section icon is the whole control, so it grows and centres.
        open ? 'gap-2 p-1.5' : 'text-muted-foreground justify-center px-1.5 py-2',
      )}
    >
      <Icon className={cn('shrink-0', open ? 'size-4' : 'size-[17px]')} />
      {open && (
        <>
          <span className="text-foreground min-w-0 flex-1 truncate text-left text-sm font-semibold">
            {label}
          </span>
          <Panel className="size-3.5 shrink-0 opacity-60" />
        </>
      )}
    </button>
  );
}
