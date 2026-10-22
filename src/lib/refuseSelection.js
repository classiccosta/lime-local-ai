/**
 * Ref callback that cancels every `selectstart` inside the node.
 *
 * React has no `onSelectStart` prop: it warns and drops it, so the listener
 * has to be a native one.
 */
export function refuseSelection(node) {
  const refuse = (event) => event.preventDefault();
  node.addEventListener('selectstart', refuse);
  return () => node.removeEventListener('selectstart', refuse);
}
