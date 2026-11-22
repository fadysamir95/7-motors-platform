'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Locale, TranslationKey, translations } from '@/lib/i18n';

export const LOCALE_COOKIE = 'locale';

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
}

const LocaleContext = createContext<Ctx | null>(null);

/**
 * `initialLocale` comes from the `locale` cookie, read on the server in the root
 * layout, so the first paint already uses the visitor's language (no Arabic→English flash).
 */
export function LocaleProvider({
  children,
  initialLocale = 'ar',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setLocaleState(l);
  };
  const t = (key: TranslationKey): string => translations[locale][key] ?? key;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Applies language, direction and font to the page chrome, reacting to locale changes. */
export function LocaleFrame({ children }: { children: React.ReactNode }) {
  const { locale, dir } = useLocale();
  return (
    <div lang={locale} dir={dir} className={locale === 'ar' ? 'font-ar' : 'font-en'}>
      {children}
    </div>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
