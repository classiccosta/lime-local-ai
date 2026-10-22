import { Button } from '@/components/ui/button';
import { Version } from '@/components/Version';
import { PanelToggle } from '@/features/sessions/components/PanelToggle';
import { useT } from '@/i18n/context';
import { focusRing } from '@/lib/focusRing';
import { menuContent, menuItem } from '@/lib/menu';
import { cn } from '@/lib/utils';
import { Ellipsis, MessagesSquare, Plus, Settings, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useRef, useState } from 'react';

// Long enough not to catch a tap, short enough to beat Android's own
// long-press (the context menu and text selection, at ~500ms).
const LONG_PRESS_MS = 450;
// A finger that travels further than this is scrolling the list.
const LONG_PRESS_SLOP_PX = 10;

const touchScreen = () => window.matchMedia('(hover: none)').matches;

export function SessionSidebar({
  sessions = [],
  activeId,
  onSelect,
  onDelete,
  onNew,
  onOpenSettings,
  canCreate,
  open,
  onToggle,
  sheet,
}) {
  const t = useT();
  // On a touch screen the ⋯ button is gone and a long press on the row opens
  // its menu instead, so the menu's open state is held here, per session.
  const [menuFor, setMenuFor] = useState(null);
  // The row a finger is holding, for the press-in that shows a long press is
  // under way.
  const [pressing, setPressing] = useState(null);
  const press = useRef({ timer: null, x: 0, y: 0, fired: false });

  const openMenu = (id) => {
    press.current.fired = true;
    setPressing(null);
    // Whatever the browser's own long press managed to select goes.
    window.getSelection()?.removeAllRanges();
    navigator.vibrate?.(10);
    setMenuFor(id);
  };
  const cancelPress = () => {
    clearTimeout(press.current.timer);
    setPressing(null);
  };
  const startPress = (event, id) => {
    if (event.pointerType !== 'touch') return;
    cancelPress();
    press.current = {
      timer: setTimeout(() => openMenu(id), LONG_PRESS_MS),
      x: event.clientX,
      y: event.clientY,
      fired: false,
    };
    setPressing(id);
  };
  const movePress = (event) => {
    const moved = Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y);
    if (moved > LONG_PRESS_SLOP_PX) cancelPress();
  };

  return (
    // Nothing in the sidebar is selectable: a held finger on a row, the gap
    // between two, or the empty space below them started a text selection on
    // Android and iOS, which reaches for the nearest selectable text when the
    // element under the finger has none. Hence the whole panel, not the rows,
    // and `selectstart` refused as well as the CSS, which iOS got past.
    <div
      onSelectStart={(event) => event.preventDefault()}
      className="flex h-full flex-col gap-2 select-none [-webkit-touch-callout:none]"
    >
      <PanelToggle
        icon={MessagesSquare}
        labelKey="panel.sessions"
        side="left"
        sheet={sheet}
        open={open}
        onToggle={onToggle}
      />

      <Button
        variant="ghost"
        size={open ? 'default' : 'icon'}
        onClick={onNew}
        disabled={!canCreate}
        aria-label={open ? undefined : t('sessions.new')}
        className={cn(
          'border-border hover:border-muted h-auto w-full rounded-sm border-dashed p-1.5 text-sm font-normal',
          // Centred as a rail, where the icon is the whole control; aligned to
          // the label once there is a label for it to sit beside.
          open && 'justify-start gap-2 px-2.5',
        )}
      >
        <Plus aria-hidden="true" className="size-3.5" />
        {open && <span className="truncate">{t('sessions.new')}</span>}
      </Button>

      {open &&
        (sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm pt-2">{t('sessions.empty')}</p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {sessions.map((session) => {
              const isActive = session.id === activeId;
              // Only titled sessions are stored, so the name is always real.
              const name = session.name;
              return (
                <li
                  key={session.id}
                  className={cn(
                    'group/session relative transition-transform ease-out',
                    // Sinks while held and springs back as the menu opens: the
                    // hint that holding does something. The delay keeps a tap
                    // or the start of a scroll from twitching the row; delay
                    // plus duration land on LONG_PRESS_MS.
                    pressing === session.id
                      ? 'scale-[0.96] delay-100 duration-350'
                      : 'duration-150',
                    'motion-reduce:scale-100',
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-1 rounded-xs"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      // The lift that ends a long press still clicks; it
                      // opened the menu, so it must not also open the chat.
                      if (press.current.fired) {
                        press.current.fired = false;
                        return;
                      }
                      onSelect(session.id);
                    }}
                    onPointerDown={(event) => startPress(event, session.id)}
                    onPointerMove={movePress}
                    onPointerUp={cancelPress}
                    onPointerCancel={cancelPress}
                    onContextMenu={(event) => {
                      // Android's own long press, if it wins the race: open
                      // ours instead of the browser's menu. A mouse's right
                      // click keeps the browser's.
                      if (!touchScreen()) return;
                      event.preventDefault();
                      cancelPress();
                      if (menuFor !== session.id) openMenu(session.id);
                    }}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'block w-full rounded-sm py-2 pr-9 pl-2.5 text-left text-sm touch:pr-2.5',
                      // No colour transition: fading the old highlight out
                      // leaves two rows looking selected at once.
                      'hover:bg-muted',
                      focusRing,
                      // The tick carries the active state; the fill only seats it.
                      isActive && 'bg-accent hover:bg-accent pl-2.5',
                      // The row a long press opened the menu for stays marked.
                      (menuFor === session.id || pressing === session.id) &&
                        !isActive &&
                        'bg-muted transition-colors delay-100 duration-350',
                    )}
                  >
                    {/* Faded out rather than cut with an ellipsis: an ellipsis
                        sat right beside the ⋯ menu button and read as two.
                        The mask is on the text, not the button, so the hover
                        and active fills stay whole. */}
                    <span className="block overflow-hidden whitespace-nowrap mask-r-from-[calc(100%-1.5rem)]">
                      {name}
                    </span>
                  </button>
                  <DropdownMenu.Root
                    open={menuFor === session.id}
                    onOpenChange={(next) => setMenuFor(next ? session.id : null)}
                  >
                    <DropdownMenu.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('sessions.actions', { name })}
                        className={cn(
                          'absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity',
                          // Revealed on approach where there is a pointer, and kept
                          // while its menu is open, after the pointer has left.
                          'group-hover/session:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
                          // On a touch screen a long press on the row opens the
                          // menu, so the button is never shown or tapped there.
                          // Hidden, not removed: it is still what the menu is
                          // placed against.
                          'touch:pointer-events-none touch:opacity-0!',
                        )}
                      >
                        <Ellipsis aria-hidden="true" className="size-3.5" />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={4}
                        collisionPadding={8}
                        className={cn(menuContent, 'outline-none')}
                      >
                        <DropdownMenu.Item
                          onSelect={() => onDelete(session.id)}
                          className={cn(
                            menuItem,
                            'hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive',
                          )}
                        >
                          <Trash2 className="size-3.5 shrink-0" />
                          {t('sessions.deleteShort')}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </li>
              );
            })}
          </ul>
        ))}

      {/* Pinned to the foot, under however many sessions there are: settings
          is a place to visit, not something to keep in view. Not in the phone
          sheet: the mobile header already carries a settings icon. */}
      <div className="mt-auto flex shrink-0 flex-col gap-2">
        {!sheet && (
          <Button
            variant="ghost"
            size={open ? 'default' : 'icon'}
            onClick={onOpenSettings}
            aria-label={open ? undefined : t('sessions.settings')}
            className={cn(
              'h-auto w-full rounded-sm p-1.5 text-sm font-normal',
              open && 'justify-start gap-2 px-2.5',
            )}
          >
            <Settings aria-hidden="true" className="size-3.5" />
            {open && <span className="truncate">{t('sessions.settings')}</span>}
          </Button>
        )}

        <Version open={open} />
      </div>
    </div>
  );
}
