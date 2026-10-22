import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/i18n/context';
import { closeOnTouchDown } from '@/lib/closeOnTouchDown';

/**
 * Settings as a modal, opened from the foot of the session sidebar.
 *
 * Holds whatever App passes in (SettingsContent) rather than the controls
 * themselves.
 * Scrolls inside itself, since a long endpoint list or a load error can push it
 * past a phone's height. The backdrop is set here, at half the shared default's
 * opacity, so the attachment preview that also uses the dialog keeps its own.
 *
 * Centred in `--app-height` (the area above the keyboard, see useKeyboardInset)
 * rather than the full screen: iOS doesn't shrink the layout viewport for the
 * keyboard, and the page is pinned so Safari can't pan, so a dialog centred on
 * the screen kept the endpoint field under the keyboard. Its height is capped to
 * the same area, so it only scrolls when the content doesn't fit there.
 */
export function SettingsDialog({ open, onOpenChange, children }) {
  const t = useT();

  // A shorter dialog keeps its scroll position, so a focused field low in it
  // can end up below the new bottom edge. Scroll just this box (never the page,
  // which must stay pinned) once the new height has been laid out.
  const keepFieldInView = (event) => {
    const box = event.currentTarget;
    const field = event.target;
    if (!field.matches('input, textarea')) return;
    requestAnimationFrame(() => {
      const pad = 16;
      const outer = box.getBoundingClientRect();
      const inner = field.getBoundingClientRect();
      if (inner.bottom > outer.bottom - pad) box.scrollTop += inner.bottom - outer.bottom + pad;
      else if (inner.top < outer.top + pad) box.scrollTop -= outer.top + pad - inner.top;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // No focus moved on open (Radix would focus the first button — a
        // model's download, which an Enter could then trigger) or on close.
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        overlayClassName="bg-black/40"
        // An 18px icon in a 32px target, placed so the icon's edge sits on the
        // 16px padding and its centre on the title's line (20px tall, 16px down).
        closeClassName="top-2.5 right-2.25 size-8 [&_svg]:size-4.5!"
        // Closes on the touch itself, not the click after it: see closeOnTouchDown.
        onOverlayPointerDown={closeOnTouchDown(onOpenChange)}
        onFocus={keepFieldInView}
        className="top-[calc(var(--app-height,100dvh)/2)] max-h-[min(85dvh,calc(var(--app-height,100dvh)-2rem))] overflow-y-auto border ring-0 sm:w-md sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-5 text-xs">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
