/**
 * Ref callback for a scroll container: when it changes height, keep what sits
 * at its bottom edge where it is.
 *
 * The keyboard opening shrinks the thread (see useKeyboardInset), and a
 * shrinking scroller keeps its `scrollTop`, so its bottom edge moved up: at the
 * end of a long chat, the last lines went under the composer and the screen
 * showed older text instead. Scrolled by the height lost (and back by the
 * height regained as the keyboard closes), the line above the composer stays
 * above it, and a chat at its end stays at its end. The browser clamps at
 * either end, so a chat too short to scroll does not move.
 *
 * Only the container's own height counts: content growing (a reply streaming
 * in) changes `scrollHeight`, which stays with assistant-ui's scrolling.
 * ResizeObserver runs after layout and before paint, in the same frame the
 * height changed, so the jump is never drawn.
 */
export function keepBottomOnResize(node) {
  if (!node) return undefined;
  let height = node.clientHeight;
  // Where it stood before the resize, not where it stands in the callback: a
  // scroller growing at its end has already been pulled back by the browser by
  // then, and subtracting the growth again left the chat that far short of the
  // end when the keyboard closed.
  let top = node.scrollTop;
  const onScroll = () => {
    // A height change not yet handled below means this scroll is the
    // browser's pull-back from it, not the user. useKeyboardInset measures
    // right after setting the height, which lays out at once, so that scroll
    // event arrived ahead of the observer and overwrote the position it needs.
    if (node.clientHeight !== height) return;
    top = node.scrollTop;
  };
  const observer = new ResizeObserver(() => {
    const delta = node.clientHeight - height;
    if (delta === 0) return;
    // At the end before the resize means at the end after it, whatever the
    // arithmetic: Safari resizes several times per keyboard (prediction, then
    // its late report), and a pixel lost to rounding on each added up.
    const atEnd = top >= node.scrollHeight - height - 2;
    height = node.clientHeight;
    // Instant: the thread has `scroll-smooth`, which would animate it.
    node.scrollTo({ top: atEnd ? node.scrollHeight : top - delta, behavior: 'instant' });
    top = node.scrollTop;
  });
  node.addEventListener('scroll', onScroll, { passive: true });
  observer.observe(node);
  return () => {
    node.removeEventListener('scroll', onScroll);
    observer.disconnect();
  };
}
