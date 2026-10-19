import { Title } from '@/features/chat/components/Title';
import { useT } from '@/i18n/context';
import { Menu, Settings } from 'lucide-react';

/**
 * The mobile app bar, standing in for both side panels.
 *
 * Sessions on the left, settings on the right, title between them — the two
 * things the panels held, reduced to the two buttons that open them.
 */
export function MobileHeader({ title, onOpenSessions, onOpenSettings }) {
  const t = useT();

  return (
    <header className="bg-background flex h-13 shrink-0 items-center gap-2.5 border-b px-3">
      <button
        type="button"
        onClick={onOpenSessions}
        aria-label={t('panel.show', { label: t('panel.sessions').toLowerCase() })}
        className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Menu aria-hidden="true" className="size-[18px]" />
      </button>

      {/* Centred by the two equal-width buttons flanking it, so the title stays
          put whatever its length rather than shifting with the controls. */}
      <div className="flex min-w-0 flex-1 justify-center text-center">
        <Title>{title}</Title>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label={t('panel.show', { label: t('panel.settings').toLowerCase() })}
        className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Settings aria-hidden="true" className="size-[17px]" />
      </button>
    </header>
  );
}
