// Every preference lives under one prefix, and every access survives storage
// that throws (Safari private mode, blocked site data): reads fall back,
// writes are skipped — the choice still holds for this session.
const PREFIX = 'ai-chat:';

export function readPref(key, fallback = null) {
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    /* not persisted */
  }
}

// Keys from features that no longer exist (ADR-011, s3-00).
const LEGACY_KEYS = ['onboarded', 'panel:config', 'incomplete-models', 'runtime'];

export function dropLegacyPrefs() {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* nothing to clean */
    }
  }
}
