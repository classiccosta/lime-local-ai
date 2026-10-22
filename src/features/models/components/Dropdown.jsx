import { useT } from '@/i18n/context';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';

// A menu, not a select. Radix Select re-uses the trigger's own position for its
// list, so on a touch device the currently-selected row opens directly under
// the finger that opened it and the lift is read as a press on that row rather
// than as the end of the tap that opened the menu — leaving it standing open.
// DropdownMenu has no such overlap, and it is what the composer picker and the
// language switch already use, so all three now behave the same way.
export function Dropdown({ loading, error, value, options = [], onChange, label, hint, disabled }) {
  const t = useT();
  if (loading) return <p className="text-muted-foreground text-xs">{t('model.loading')}</p>;
  if (error) return <p className="text-destructive text-xs">{t('model.listError')}</p>;

  const selected = options.find((option) => option.id === value);

  return (
    <div className="flex flex-col gap-2">
      {/* Label first, then the hint, then the control — the order the endpoint
          field uses, so the two runtime tabs read the same way. */}
      <div className="flex flex-col gap-1">
        <span id="model-select-label" className="text-muted-foreground text-xs">
          {label}
        </span>
        {hint && <p className="text-muted-foreground text-xs leading-normal opacity-70">{hint}</p>}
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          disabled={disabled}
          aria-labelledby="model-select-label"
          className="bg-card border-border focus-visible:ring-ring flex w-full items-center justify-between gap-2 rounded-sm border px-2.5 py-1.5 text-xs focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? (selected.label ?? selected.id) : t('model.placeholder')}
          </span>
          <ChevronDown aria-hidden="true" className="text-muted-foreground size-3 shrink-0" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          {/* --popover sits within a few points of --muted, so over the model
              info card the two surfaces read as one sheet. The list is raised
              onto --secondary instead and given a hard shadow, which separates
              it from whatever it covers rather than relying on the border
              alone. */}
          <DropdownMenu.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={8}
            className="bg-secondary text-secondary-foreground border-border z-50 max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-md border p-1 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.65)]"
          >
            {options.map((option) => (
              <DropdownMenu.Item
                key={`${option.provider}: ${option.id}`}
                onSelect={() => onChange(option.id)}
                className={cn(
                  'data-[highlighted]:bg-primary/20 flex cursor-default items-center justify-between gap-3 rounded-sm px-2.5 py-1 text-xs outline-none select-none',
                  option.id === value && 'text-primary',
                )}
              >
                <span className="truncate">{option.label ?? option.id}</span>
                {option.id === value && <Check aria-hidden="true" className="size-3 shrink-0" />}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
