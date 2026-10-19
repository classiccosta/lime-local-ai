/**
 * `onPointerDown` for a dialog backdrop: on a touch, close straight away.
 *
 * Radix waits for the `click` that follows a touch before it dismisses — so
 * the lifting finger cannot activate whatever is under the backdrop. On a real
 * iPhone, though, a layer removed at that `click` left iOS in a state where the
 * next keyboard panned the page ~80px: the header flicker after closing the
 * sidebar or settings. Removed at `pointerdown` it never happened (tested on
 * device with a bare fixed layer either way).
 *
 * The protection Radix's delay gave is kept by hand: the one `click` iOS still
 * sends when the finger lifts is swallowed before anything sees it.
 */
export function closeOnTouchDown(onOpenChange) {
  return (event) => {
    if (event.pointerType !== 'touch') return;
    // A menu or popover open over the panel (a session's ⋯ menu, the language
    // select) takes the first tap for itself: Radix dismisses just that layer,
    // and only a second tap on the backdrop closes the panel.
    if (document.querySelector('[data-radix-popper-content-wrapper]')) return;
    const swallow = (click) => {
      click.preventDefault();
      click.stopPropagation();
    };
    // Out of hit-testing at once. Closing alone was not enough: the backdrop
    // stays mounted for its fade-out, so the click still landed on it and it
    // vanished right after — the same pattern as dismissing on click. With
    // pointer events off, the click falls through to the page beneath (and is
    // swallowed below), while the fade carries on.
    event.currentTarget.style.pointerEvents = 'none';
    window.addEventListener('click', swallow, { capture: true, once: true });
    // A tap that never turns into a click (a drag, a cancelled touch) must not
    // leave the listener waiting to eat the next, unrelated one.
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 600);
    onOpenChange(false);
  };
}
