import { useEffect } from 'react';
import { readPref, writePref } from './prefs';

const FIELD = 'input, textarea, [contenteditable="true"]';
// How long a prediction holds against readings that disagree with it. Safari
// reports the keyboard's size only after its animation, and the simulator
// later still — over two seconds at times — and it flickers back to the old
// size mid-animation. Until the wait is over a disagreeing reading is ignored.
const SETTLE_MS = 3000;
// Below this, a difference between the window and the visible area is the
// browser's own toolbar sliding, not a keyboard.
const KEYBOARD_MIN_PX = 120;
// Android browsers honour `interactive-widget=resizes-content`: the window
// itself shrinks, once, after their keyboard animation. Predicting on focus
// there only guessed a height the real resize then corrected, so the welcome
// line slid one way and bounced back, on the way up and again on the way down.
// Chrome on iOS (CriOS) is WebKit underneath but shrinks the window too, frame
// by frame and within ~100ms of the focus. Its keyboard-down button also closes
// the keyboard without a blur, and a close inside the prediction's wait was
// ignored until the wait ran out: the layout sat at the open height, then
// snapped. Following the resize is already right, so the prediction is
// Safari's alone.
const PREDICTS = typeof navigator !== 'undefined' && !/Android|CriOS/i.test(navigator.userAgent);
// Chrome also hides its URL bar as the keyboard opens and shows it again as the
// keyboard closes, each a separate resize ahead of the keyboard's own: the
// window grew 24px before shrinking, and shrank 24px before growing, and the
// welcome line nudged the wrong way first. For this long after a focus change,
// a reading moving against it is that bar and is skipped.
const DIRECTION_MS = 1000;

/**
 * Size the app to the part of the window the on-screen keyboard leaves visible.
 *
 * Safari does not shrink the layout viewport when the keyboard opens. It keeps
 * the page at full height, draws the keyboard over the bottom of it, and pans
 * the document to bring the focused field into view. `visualViewport.height`
 * is the only thing that reports the visible area, so it is published as
 * `--app-height` for the root to size itself to.
 *
 * Safari also reports that size late: only once its keyboard animation has
 * finished, so a layout that waits for it trails the keyboard and then snaps.
 * The layout therefore moves on focus and blur, to the keyboard height measured
 * the last time it opened (kept across visits; an estimate the very first
 * time), and the elements riding on the keyboard slide there with it (see
 * `apply`). The late report then only corrects whatever the prediction got
 * wrong.
 *
 * `offsetTop` is never subtracted: it is that document pan, and subtracting it
 * cancelled the keyboard out. `--keyboard-inset` is still published, for the
 * overlays that size themselves against it.
 *
 * Written to the document rather than held in state: it changes many times a
 * second while the keyboard moves, and re-rendering the app for it is the
 * wrong trade.
 *
 * On Chrome the viewport meta shrinks the layout viewport itself, so the
 * visible height and `innerHeight` agree; the same code just follows them.
 */
const HEIGHT_KEY = 'keyboard-height';

// A missing height is fine: it is measured again on the next keyboard.
function readStoredHeight() {
  const value = Number(readPref(HEIGHT_KEY));
  return value > KEYBOARD_MIN_PX ? value : null;
}

function storeHeight(value) {
  writePref(HEIGHT_KEY, Math.round(value));
}

export function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const html = document.documentElement;
    const root = html.style;
    const touch = window.matchMedia('(pointer: coarse)');

    // The last keyboard height measured on this device, so the very first
    // prediction of a visit is already right. Before any has been measured, an
    // iPhone's is a little over 40% of the window.
    let keyboardHeight = readStoredHeight() ?? Math.round(window.innerHeight * 0.42);
    // `{ open, until }` while a focus change is waiting for Safari to report.
    let pending = null;
    let settleTimer = null;
    // Android only: `{ shrinking, until }` after a focus change, see DIRECTION_MS.
    let direction = null;
    let appliedHeight = null;
    // A prediction nothing ever confirms — a touch on a field that turned into
    // a scroll, so no keyboard came — must not stick: once the wait is over,
    // the real size is read again.
    const expect = (open) => {
      pending = { open, until: Date.now() + SETTLE_MS };
      clearTimeout(settleTimer);
      settleTimer = setTimeout(measure, SETTLE_MS + 50);
    };

    // The layout itself changes in one step: animating the root's height
    // re-laid-out the whole app on every frame, which on a phone flickered and
    // stuttered. Instead the elements that follow the keyboard (marked
    // `data-keyboard-follow`) are moved FLIP-style — measured before and after,
    // then slid from the old spot to the new with a transform, which the
    // compositor animates without any layout. A correction arriving midway
    // starts from wherever they are, so it bends the motion rather than
    // restarting it. `instant` skips the slide.
    // Slower than the keyboard on purpose: matched to it, the slide read as
    // abrupt on a phone, and Safari's URL bar lags behind both anyway — this
    // sits between the two. A gentle ease-in-out rather than iOS's snappy
    // keyboard curve, for the same reason.
    const OPEN_MS = 500;
    const CLOSE_MS = 550;
    const EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (height, open, instant = false) => {
      const followers = touch.matches
        ? [...document.querySelectorAll('[data-keyboard-follow]')]
        : [];
      // Where each is on screen now, mid-slide included.
      const before = followers.map((el) => el.getBoundingClientRect().top);
      followers.forEach((el) => el.getAnimations().forEach((animation) => animation.cancel()));

      appliedHeight = height;
      root.setProperty('--app-height', `${height}px`);
      root.setProperty('--keyboard-inset', `${Math.max(0, window.innerHeight - height)}px`);
      html.dataset.keyboard = open ? 'open' : 'closed';

      if (instant || reduced.matches) return;
      followers.forEach((el, index) => {
        // `data-keyboard-follow="close"` slides only as the keyboard goes
        // down. The composer is one: sliding up, it is drawn below its real
        // place for half a second, and if iOS checks then whether the focused
        // field is hidden by the keyboard, it sees it hidden and pans the page
        // to reveal it — by however far the slide still had to go (45–95px on
        // device), which is the header flicker. Placed at once, it never is.
        if (open && el.dataset.keyboardFollow === 'close') return;
        const delta = before[index] - el.getBoundingClientRect().top;
        if (Math.abs(delta) < 1) return;
        el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
          duration: open ? OPEN_MS : CLOSE_MS,
          easing: EASING,
        });
      });
    };

    // html and body cannot scroll by overflow, but Safari still pans the
    // document to reveal a focused field, and Chrome scrolls it to reveal a
    // tapped one. Put it back whichever moved.
    const resetScroll = () => {
      if (window.scrollY !== 0 || viewport.offsetTop !== 0) window.scrollTo(0, 0);
    };

    const measure = () => {
      // A pinch-zoom shrinks and pans the visual viewport too. That is the user
      // looking closer, not a keyboard, so the layout is left at full height
      // and the pan is left alone.
      if (viewport.scale > 1.01) {
        root.removeProperty('--app-height');
        root.removeProperty('--keyboard-inset');
        return;
      }
      // Safari shows the keyboard as a gap between the window and the visible
      // area; Chrome shrinks the window with it, so there it shows against the
      // screen. Touch screens only: a short desktop window is not a keyboard.
      const covered = Math.max(
        window.innerHeight - viewport.height,
        window.screen.height - viewport.height - 160,
      );
      const measuredOpen = touch.matches && covered > KEYBOARD_MIN_PX;

      // The size Safari reports trails the focus — by a second or more in the
      // simulator — and flickers on the way: mid-animation it can report the
      // old size again right after the new one. So for the whole wait after a
      // focus change, a reading that contradicts it is ignored, even after one
      // that agreed; only once the wait is over is the reading trusted again.
      if (pending && Date.now() < pending.until && measuredOpen !== pending.open) return;
      if (pending && Date.now() >= pending.until) pending = null;

      if (measuredOpen && window.innerHeight - viewport.height > KEYBOARD_MIN_PX) {
        keyboardHeight = window.innerHeight - viewport.height;
        storeHeight(keyboardHeight);
      }
      // Past the wait, the reading is trusted either way: a field with focus
      // and no keyboard on screen is a hardware keyboard (an iPad's), and a
      // keyboard still showing after a blur is still showing.
      if (direction && Date.now() < direction.until && appliedHeight !== null) {
        const against = direction.shrinking
          ? viewport.height > appliedHeight
          : viewport.height < appliedHeight;
        if (against) return;
      }

      const open = measuredOpen;
      apply(viewport.height, open);
      resetScroll();
    };

    // Moving with the focus rather than after it is what keeps the composer on
    // the keyboard's edge during the animation instead of catching up after.
    // On the focus, not on the touch that leads to it: moving the layout at
    // touchstart slid the field out from under the finger, so the tap landed
    // elsewhere, the field never took focus, and no keyboard came up.
    const predictOpen = (event, instant = true) => {
      if (!touch.matches || !event.target.closest?.(FIELD)) return;
      if (!PREDICTS) {
        direction = { shrinking: true, until: Date.now() + DIRECTION_MS };
        return;
      }
      if (pending?.open) return;
      expect(true);
      apply(window.innerHeight - keyboardHeight, true, instant);
    };

    // Safari scrolls the page to reveal a field focused by a tap, whatever the
    // layout does: the header slid down a few hundred pixels and back. So a tap
    // on a field that is not focused yet is taken over at touchend — the
    // browser's own handling cancelled, the layout moved, then the field
    // focused with `preventScroll`. Still inside the tap, so the keyboard
    // opens. Only a tap: a touch that travelled is a scroll and is left alone.
    let touchStart = null;
    const onTouchStart = (event) => {
      const point = event.touches[0];
      touchStart = point ? { x: point.clientX, y: point.clientY } : null;
    };
    const onTouchEnd = (event) => {
      if (!touch.matches || event.touches.length > 0) return;
      const field = event.target.closest?.(FIELD);
      if (!field || field.disabled || field.readOnly) return;
      // Already focused with the keyboard up: a tap there moves the caret, and
      // is the browser's. Focused with no keyboard (autofocus, or after the
      // keyboard was dismissed without a blur) still needs taking over — that
      // first tap is the one that used to let Safari pan the header away.
      const focused = field === document.activeElement;
      if (focused && html.dataset.keyboard === 'open') return;
      const point = event.changedTouches[0];
      if (!point || !touchStart) return;
      const moved = Math.hypot(point.clientX - touchStart.x, point.clientY - touchStart.y);
      if (moved > 10) return;
      event.preventDefault();
      // Eased: the focus below cannot make Safari pan, so there is no race.
      predictOpen({ target: field }, false);
      // Focusing what already has focus does nothing, keyboard included.
      if (focused) field.blur();
      field.focus({ preventScroll: true });
    };
    const onFocusOut = (event) => {
      if (!touch.matches || !event.target.matches?.(FIELD)) return;
      // Focus moving straight to another field keeps the keyboard up.
      if (event.relatedTarget?.matches?.(FIELD)) return;
      if (!PREDICTS) {
        direction = { shrinking: false, until: Date.now() + DIRECTION_MS };
        return;
      }
      expect(false);
      apply(window.innerHeight, false);
    };

    // Safari keeps the layout viewport at full height under the keyboard, and
    // lets a drag pan the page into the part the keyboard covers — on an empty
    // chat, where nothing scrolls, that drag is all there is. A one-finger drag
    // is let through only when something under it can actually scroll; pinches
    // (two fingers) always pass, so zoom is untouched.
    const guard = (event) => {
      if (event.touches.length > 1) return;
      for (let node = event.target; node && node !== document.body; node = node.parentElement) {
        const { overflowY, overflowX } = getComputedStyle(node);
        const scrollsY = /(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight;
        const scrollsX = /(auto|scroll)/.test(overflowX) && node.scrollWidth > node.clientWidth;
        if (scrollsY || scrollsX) return;
      }
      event.preventDefault();
    };

    measure();
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    window.addEventListener('scroll', resetScroll);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('focusin', predictOpen);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('touchmove', guard, { passive: false });
    return () => {
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
      window.removeEventListener('scroll', resetScroll);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('focusin', predictOpen);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('touchmove', guard);
      root.removeProperty('--app-height');
      root.removeProperty('--keyboard-inset');
      clearTimeout(settleTimer);
      delete html.dataset.keyboard;
    };
  }, []);
}
