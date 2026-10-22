import { Button } from '@/components/ui/button';
import { Title } from '@/features/layout/components/Title';
import { useT } from '@/i18n/context';
import { Menu, Settings } from 'lucide-react';

const HEADER_BUTTON = 'text-muted-foreground size-9 rounded-[10px]';

/**
 * The mobile app bar, standing in for both side panels.
 *
 * Sessions on the left, settings on the right, title between them — the two
 * things the panels held, reduced to the two buttons that open them.
 */
export function MobileHeader({ title, onOpenSessions, onOpenSettings }) {
  const t = useT();
  const sessionsLabel = t('panel.show', { label: t('panel.sessions').toLowerCase() });
  const settingsLabel = t('panel.show', { label: t('panel.settings').toLowerCase() });

  return (
    <header className="bg-background flex h-13 shrink-0 items-center gap-2.5 border-b px-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSessions}
        aria-label={sessionsLabel}
        className={HEADER_BUTTON}
      >
        <Menu aria-hidden="true" className="size-4" />
      </Button>

      {/* Centred by the two equal-width buttons flanking it, so the title stays
          put whatever its length rather than shifting with the controls. */}
      <div className="flex min-w-0 flex-1 justify-center text-center">
        <Title>{title}</Title>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSettings}
        aria-label={settingsLabel}
        className={HEADER_BUTTON}
      >
        <Settings aria-hidden="true" className="size-4" />
      </Button>
    </header>
  );
}
