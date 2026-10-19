import { closeOnTouchDown } from '@/lib/closeOnTouchDown';
import { cn } from '@/lib/utils';
import { Dialog } from 'radix-ui';

/**
 * A panel's mobile container: over the thread rather than beside it.
 *
 * Radix Dialog rather than a bare fixed div, for the focus trap, the Escape
 * handling and the scroll lock — all of which a panel covering the whole screen
 * needs and an <aside> never did.
 *
 * `selectable={false}` makes nothing in the sheet selectable, down to its
 * padding and hidden title. Not the default: the settings sheet has inputs.
 */
export function MobileSheet({
  open,
  onOpenChange,
  side = 'left',
  label,
  selectable = true,
  children,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Closes on the touch itself, not the click after it: see closeOnTouchDown. */}
        <Dialog.Overlay
          onPointerDown={closeOnTouchDown(onOpenChange)}
          className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 duration-200 ease-out data-[state=closed]:ease-in"
        />
        <Dialog.Content
          aria-describedby={undefined}
          // No focus moved on open or close: a tap that opens a panel should
          // not leave a button inside it focused, nor hand focus back to the
          // composer from code when it closes.
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
          // CSS alone did not stop a long press selecting on iOS: it reached
          // past the unselectable rows for the nearest text it could take,
          // the sr-only title. Refusing the selection outright leaves it none.
          onSelectStart={selectable ? undefined : (event) => event.preventDefault()}
          className={cn(
            'bg-sidebar fixed z-50 flex flex-col outline-none',
            !selectable && 'select-none [-webkit-touch-callout:none]',
            'duration-200 ease-out data-[state=closed]:ease-in',
            'motion-reduce:duration-0',
            // Both anchor to the top and give up height at the bottom, so a
            // keyboard opening shrinks the panel instead of moving it or
            // hiding its lower half. `--keyboard-inset` is 0 until one opens.
            side === 'left'
              ? 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left top-0 bottom-[var(--keyboard-inset,0px)] left-0 w-[300px] max-w-[85vw] border-r'
              : // Fades and scales in place rather than travelling down. It is
                // a card over the thread, not a panel arriving from an edge —
                // the drawer is the one with an edge to come from.
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 top-10 right-4 left-4 max-h-[calc(var(--app-height,100dvh)-5rem)] rounded-2xl border',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
          )}
        >
          <Dialog.Title className="sr-only select-none">{label}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
