import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { LocaleFrame, LocaleProvider, LOCALE_COOKIE } from '@/components/LocaleProvider';
import type { Locale } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ToastHost from '@/components/ToastHost';

/*
 * Fonts are self-hosted (src/fonts, all Open Font Licence) so neither dev nor build needs to reach Google Fonts.
 * Tajawal is split into an Arabic and a Latin face with unicode-range so each script loads only its own file.
 * Brand faces (logo usage guide): Exo 2 Black Italic for numbers and prices, Archivo Expanded Black Italic for Latin headings.
 */
const geistSans = localFont({
  variable: '--font-geist-sans',
  src: [{ path: '../fonts/geist-latin-100-900.woff2', weight: '100 900', style: 'normal' }],
  display: 'swap',
  adjustFontFallback: false,
});
const geistMono = localFont({
  variable: '--font-geist-mono',
  src: [{ path: '../fonts/geist-mono-latin-100-900.woff2', weight: '100 900', style: 'normal' }],
  display: 'swap',
  adjustFontFallback: false,
});
const tajawal = localFont({
  variable: '--font-tajawal',
  src: [
    { path: '../fonts/tajawal-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/tajawal-arabic-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/tajawal-arabic-700.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/tajawal-arabic-800.woff2', weight: '800', style: 'normal' },
  ],
  declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200F, U+FB50-FDFF, U+FE70-FEFF' }],
  display: 'swap',
  adjustFontFallback: false,
});
const tajawalLatin = localFont({
  variable: '--font-tajawal-latin',
  src: [
    { path: '../fonts/tajawal-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/tajawal-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/tajawal-latin-700.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/tajawal-latin-800.woff2', weight: '800', style: 'normal' },
  ],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
  display: 'swap',
  adjustFontFallback: false,
});
const exo = localFont({
  variable: '--font-exo',
  src: [{ path: '../fonts/exo2-black-italic-latin-900.woff2', weight: '900', style: 'italic' }],
  display: 'swap',
  adjustFontFallback: false,
});
const archivo = localFont({
  variable: '--font-archivo',
  src: [{ path: '../fonts/archivo-italic-latin-100-900.woff2', weight: '100 900', style: 'italic' }],
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'SEVEN MOTORS',
  description: 'Automotive platform',
};

export const viewport: Viewport = { themeColor: '#1e1f1c' };

/**
 * Reads the visitor's language from the `locale` cookie on the server so the very first
 * paint is already in the right language and direction (no Arabic -> English flash).
 * Reading cookies is request-time data, so it lives inside a Suspense boundary.
 */
async function LocaleShell({ children }: { children: React.ReactNode }) {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const initialLocale: Locale = cookie === 'en' ? 'en' : 'ar';
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <LocaleFrame>
        <Header />
        <main id="main" className="min-h-screen">{children}</main>
        <Footer />
        <ToastHost />
      </LocaleFrame>
    </LocaleProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${tajawal.variable} ${tajawalLatin.variable} ${exo.variable} ${archivo.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <LocaleShell>{children}</LocaleShell>
        </Suspense>
      </body>
    </html>
  );
}
