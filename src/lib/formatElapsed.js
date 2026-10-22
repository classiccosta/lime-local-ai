const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// Past this, seconds stop ticking: they reassure that a slow local model is
// still working, but `14m 37s` vs `14m 38s` is just noise.
export const SECONDS_UNTIL = 10 * MINUTE;

const pad = (n) => String(n).padStart(2, '0');

// Units are left untranslated: s/m/h read the same in every shipped locale, and
// Intl.DurationFormat's long forms (`1 Min., 23 Sek.`) are too wide for a label.
export function formatElapsed(ms) {
  if (!(ms >= SECOND)) return '';
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  const seconds = Math.floor((ms % MINUTE) / SECOND);
  if (ms < MINUTE) return `${seconds}s`;
  if (ms < SECONDS_UNTIL) return `${minutes}m ${pad(seconds)}s`;
  if (ms < HOUR) return `${minutes}m`;
  return `${hours}h ${pad(minutes)}m`;
}

// How long until formatElapsed's output next changes.
export function nextTickIn(ms) {
  const step = ms < SECONDS_UNTIL ? SECOND : MINUTE;
  return step - (Math.max(ms, 0) % step);
}
