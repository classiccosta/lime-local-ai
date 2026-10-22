import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocaleContext, makeTranslator } from './context';
import { readPref, writePref } from '@/lib/prefs';
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from './locales';

const STORAGE_KEY = 'locale';

function readStoredLocale() {
  const stored = readPref(STORAGE_KEY);
  if (LOCALES.some((locale) => locale.id === stored)) return stored;
  // No stored choice is not the same as choosing English: the browser already
  // states which languages the reader has, so it is asked before defaulting.
  return resolveLocale(navigator.languages ?? [navigator.language]);
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  const setLocale = useCallback((next) => {
    writePref(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  // Assistive technology and the browser's own hyphenation read this, and it is
  // the one piece of the document outside React's tree.
  useEffect(() => {
    const active = LOCALES.find((entry) => entry.id === locale);
    document.documentElement.lang = active?.tag ?? DEFAULT_LOCALE;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t: makeTranslator(locale) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
