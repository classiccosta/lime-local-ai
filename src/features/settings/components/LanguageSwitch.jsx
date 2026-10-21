import { SettingValue } from '@/features/settings/components/SettingValue';
import { useLocale } from '@/i18n/context';
import { LOCALES } from '@/i18n/locales';
import { menuContent, menuItem } from '@/lib/menu';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';

/**
 * Language picker, at the foot of the settings panel.
 *
 * Plain text with a Change link, the way the endpoint reads above it; the menu
 * only exists once Change is pressed, and opens straight away so that press is
 * not followed by a second one on a trigger. Closing it — by a pick or by
 * dismissing — returns to the text.
 */
export function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale();
  const [editing, setEditing] = useState(false);
  const active = LOCALES.find((entry) => entry.id === locale);

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <span id="language-label" className="text-muted-foreground text-xs">
        {t('language.label')}
      </span>
      {!editing ? (
        <SettingValue
          value={active?.label}
          changeLabel={t('language.change')}
          onChange={() => setEditing(true)}
        />
      ) : (
        <DropdownMenu.Root defaultOpen onOpenChange={(open) => !open && setEditing(false)}>
          <DropdownMenu.Trigger
            aria-labelledby="language-label"
            className="bg-card border-border focus-visible:ring-ring flex h-7 w-full items-center justify-between gap-2 rounded-sm border px-2.5 text-xs focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="truncate">{active?.label}</span>
            <ChevronDown aria-hidden="true" className="text-muted-foreground size-3 shrink-0" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              align="start"
              sideOffset={6}
              collisionPadding={8}
              className={cn(menuContent, 'min-w-[var(--radix-dropdown-menu-trigger-width)]')}
            >
              {LOCALES.map((entry) => (
                <DropdownMenu.Item
                  key={entry.id}
                  onSelect={() => setLocale(entry.id)}
                  className={cn(
                    menuItem,
                    'justify-between gap-3',
                    entry.id === locale && 'text-primary',
                  )}
                >
                  {entry.label}
                  {entry.id === locale && <Check aria-hidden="true" className="size-3 shrink-0" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}
