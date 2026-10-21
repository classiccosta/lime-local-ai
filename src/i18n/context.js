import { createContext, useContext } from 'react';
import { en } from './en';
import { pt } from './pt';
import { de } from './de';
import { DEFAULT_LOCALE } from './locales';

export const DICTIONARIES = { en, pt, de };

/**
 * Fill `{name}` placeholders from `values`.
 *
 * A placeholder with nothing to fill it is left standing rather than blanked:
 * a visible `{count}` in the UI is a bug report, an empty gap is a mystery.
 */
function interpolate(template, values) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

export function makeTranslator(locale) {
  const dictionary = DICTIONARIES[locale] ?? en;
  return function translate(key, values) {
    // English is the source language, so it is also the fallback: an untranslated
    // key shows the real sentence rather than a raw key. The key itself is the
    // last resort, and only reachable if it exists nowhere.
    const template = dictionary[key] ?? en[key] ?? key;
    return interpolate(template, values);
  };
}

export const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: makeTranslator(DEFAULT_LOCALE),
});

export function useLocale() {
  return useContext(LocaleContext);
}

/** The common case: a component needs the translator and nothing else. */
export function useT() {
  return useContext(LocaleContext).t;
}
