'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Locale, translations } from '@/lib/i18n';

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof (typeof translations)['en']) => string;
  dir: 'rtl' | 'ltr';
}

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');
  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved === 'ar' || saved === 'en') setLocaleState(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = (l: Locale) => setLocaleState(l);
  const t = (key: any) => (translations[locale] as any)[key] ?? key;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
