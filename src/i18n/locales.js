// The languages the UI is written in, in the order the switch offers them.
// `label` is each language's name in that language — a reader looking for their
// own is looking for the word they use for it, not its English name.
export const LOCALES = [
  { id: 'en', label: 'English', tag: 'en' },
  { id: 'pt', label: 'Português', tag: 'pt-PT' },
  { id: 'de', label: 'Deutsch', tag: 'de' },
];

export const DEFAULT_LOCALE = 'en';

/**
 * Best match for a browser language list.
 *
 * Matched on the primary subtag, so `pt-BR` also lands on Portuguese: the
 * translations are pt-PT, and European Portuguese is far closer to what a
 * Brazilian reader expects than English is.
 */
export function resolveLocale(languages = []) {
  for (const language of languages) {
    const primary = String(language).toLowerCase().split('-')[0];
    const match = LOCALES.find((locale) => locale.id === primary);
    if (match) return match.id;
  }
  return DEFAULT_LOCALE;
}
