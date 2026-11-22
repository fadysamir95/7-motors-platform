import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { Geist, Geist_Mono, Tajawal } from 'next/font/google';
import './globals.css';
import { LocaleFrame, LocaleProvider, LOCALE_COOKIE } from '@/components/LocaleProvider';
import type { Locale } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const tajawal = Tajawal({
  variable: '--font-tajawal',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '7 MOTORS',
  description: 'Automotive platform',
};

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
      </LocaleFrame>
    </LocaleProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${tajawal.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <LocaleShell>{children}</LocaleShell>
        </Suspense>
      </body>
    </html>
  );
}
