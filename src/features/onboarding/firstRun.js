// Keys the app writes the moment a user touches anything: the runtime switch,
// the model picker, the endpoint field, either panel toggle. Their absence is
// what "no user data" means here — a returning user has at least one of them
// even if they never sent a message.
const ONBOARDED_KEY = 'ai-chat:onboarded';
const PREFERENCE_KEYS = ['ai-chat:model', 'ai-chat:runtime', 'ai-chat:endpoint', 'ai-chat:locale'];
const PANEL_PREFIX = 'ai-chat:panel:';

/**
 * Whether this browser has never used the app.
 *
 * Must be read once, at mount, before any effect runs: the auto-select effect
 * writes `ai-chat:model` within a tick of the model list arriving, so anything
 * asking this question later would find a fresh install already looking used.
 *
 * Sessions are deliberately not consulted — `useSessions` seeds an empty row on
 * first run, so the list is never empty and cannot tell the two apart.
 */
export function readPristine() {
  try {
    if (localStorage.getItem(ONBOARDED_KEY)) return false;
    if (PREFERENCE_KEYS.some((key) => localStorage.getItem(key) !== null)) return false;
    for (let index = 0; index < localStorage.length; index += 1) {
      if (localStorage.key(index)?.startsWith(PANEL_PREFIX)) return false;
    }
    return true;
  } catch {
    // Site data blocked: nothing can be remembered, so a modal that cannot
    // remember being answered would return on every load.
    return false;
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* the answer holds for this session even if it cannot be recorded */
  }
}
