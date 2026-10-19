import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocaleContext, makeTranslator } from './context';
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from './locales';

const STORAGE_KEY = 'ai-chat:locale';

function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.some((locale) => locale.id === stored)) return stored;
  } catch {
    /* site data blocked; fall through to the browser's own languages */
  }
  // No stored choice is not the same as choosing English: the browser already
  // states which languages the reader has, so it is asked before defaulting.
  return resolveLocale(navigator.languages ?? [navigator.language]);
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  const setLocale = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice holds for this session even if it cannot be remembered */
    }
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
