import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import type { Translations, Locale, LocaleConfig } from "./types";
import en from "./locales/en";
import fr from "./locales/fr";

// Registry of all available locales — add new ones here
const localeRegistry: Record<Locale, LocaleConfig> = {
  en,
  fr,
};

const DEFAULT_LOCALE: Locale = "en";
const STORAGE_KEY = "mdoc-locale";

/** Set of supported locale codes */
export const SUPPORTED_LOCALES = new Set(Object.keys(localeRegistry));

/** Check if a locale code is supported */
export function isValidLocale(code: string): code is Locale {
  return SUPPORTED_LOCALES.has(code);
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  availableLocales: LocaleConfig[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function getInitialLocale(): Locale {
  // 0. Check URL path for locale prefix
  const pathMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (pathMatch && localeRegistry[pathMatch[1]]) return pathMatch[1];

  // 1. Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && localeRegistry[stored]) return stored;

  // 2. Check browser language
  const browserLang = navigator.language.split("-")[0];
  if (localeRegistry[browserLang]) return browserLang;

  // 3. Fallback
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    if (localeRegistry[newLocale]) {
      setLocaleState(newLocale);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const availableLocales = useMemo(() => Object.values(localeRegistry), []);

  const t =
    localeRegistry[locale]?.translations ??
    localeRegistry[DEFAULT_LOCALE].translations;

  const value = useMemo(
    () => ({ locale, t, setLocale, availableLocales }),
    [locale, t, setLocale, availableLocales],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
