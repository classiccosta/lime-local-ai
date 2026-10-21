/**
 * Ref callback for a scroll container: while its end is in view, keep it there
 * as the content grows — a reply streaming in.
 *
 * assistant-ui does this itself, but it decides the user has scrolled away from
 * the scroll positions alone: a scroll event reading higher than the last one,
 * at the same `scrollHeight`, counts as the user scrolling up. iOS Safari sends
 * exactly that on its own. ~10ms after a programmatic scroll to the end it
 * reports a position 4–36px short of it, with nothing changed; on a phone the
 * reply stopped being followed midway, as soon as a block (a list, a table, a
 * code block) landed in one piece. So here only input stops the following —
 * a drag, a wheel or key scrolling up, a press on the scrollbar — and reaching
 * the end again, by any means, resumes it.
 *
 * ResizeObserver runs after layout and before paint, so the growth is never
 * drawn above the end first.
 */
const UP_KEYS = new Set(['ArrowUp', 'PageUp', 'Home']);

export function followBottom(node) {
  const content = node?.firstElementChild;
  if (!content) return undefined;
  let following = true;
  let top = node.scrollTop;
  const stop = () => {
    following = false;
  };
  const onScroll = () => {
    // Moving down onto the end, not merely being there: the event for our own
    // last scroll to the end can arrive just after a wheel turn up, and it
    // resumed what the wheel had stopped.
    const atEnd = node.scrollHeight - node.scrollTop - node.clientHeight <= 2;
    if (atEnd && node.scrollTop > top) following = true;
    top = node.scrollTop;
  };
  const onWheel = (event) => {
    if (event.deltaY < 0) stop();
  };
  const onKeyDown = (event) => {
    if (UP_KEYS.has(event.key) || (event.key === ' ' && event.shiftKey)) stop();
  };
  // A press on the container itself, not on anything inside it, is its scrollbar.
  const onPointerDown = (event) => {
    if (event.target === node) stop();
  };
  const observer = new ResizeObserver(() => {
    // Instant: the thread has `scroll-smooth`, which would animate it.
    if (following) node.scrollTo({ top: node.scrollHeight, behavior: 'instant' });
  });
  node.addEventListener('scroll', onScroll, { passive: true });
  node.addEventListener('touchmove', stop, { passive: true });
  node.addEventListener('wheel', onWheel, { passive: true });
  node.addEventListener('keydown', onKeyDown);
  node.addEventListener('pointerdown', onPointerDown);
  observer.observe(content);
  return () => {
    node.removeEventListener('scroll', onScroll);
    node.removeEventListener('touchmove', stop);
    node.removeEventListener('wheel', onWheel);
    node.removeEventListener('keydown', onKeyDown);
    node.removeEventListener('pointerdown', onPointerDown);
    observer.disconnect();
  };
}
