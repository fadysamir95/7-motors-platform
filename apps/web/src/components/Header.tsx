'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { useCartCount } from '@/lib/cart';
import { CartIcon, CloseIcon, MenuIcon } from '@/components/ui/Icons';
import type { TranslationKey } from '@/lib/i18n';

const NAV: { href: string; label: TranslationKey }[] = [
  { href: '/', label: 'home' },
  { href: '/vehicles', label: 'spareParts' },
  { href: '/booking', label: 'bookService' },
  { href: '/marketplace', label: 'navMarketplace' },
  { href: '/wholesale', label: 'wholesale' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const { t, locale, setLocale } = useLocale();
  const cartCount = useCartCount();
  const pathname = usePathname();
  // The menu is "open for a given path", so navigating automatically closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Close on Escape and return focus to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenAt(null);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const linkClass = (active: boolean) =>
    `relative py-2 text-sm font-medium transition-colors hover:text-brand-lime focus-visible:outline-none focus-visible:text-brand-lime ${
      active ? 'text-brand-lime' : 'text-brand-bone/90'
    }`;

  const toggleLocale = () => setLocale(locale === 'ar' ? 'en' : 'ar');

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-ink/95 text-brand-bone backdrop-blur supports-[backdrop-filter]:bg-brand-ink/85">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brand-lime focus:px-4 focus:py-2 focus:text-brand-ink"
      >
        {t('skipToContent')}
      </a>
      <div className="container-xl flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-lime" aria-label="SEVEN MOTORS">
          <Image src="/brand/logo-dark-bg.png" alt="" width={3122} height={676} priority sizes="150px" className="h-8 w-auto" />
        </Link>

        <nav aria-label={t('navMain')} className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                {t(n.label)}
                <span
                  className={`absolute inset-x-0 -bottom-px h-0.5 origin-center rounded-full bg-brand-lime transition-transform ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `${t('cart')} (${cartCount})` : t('cart')}
            className="relative grid h-10 w-10 place-items-center rounded-lg text-brand-bone/90 transition hover:bg-white/10 hover:text-brand-lime focus-visible:outline-2 focus-visible:outline-brand-lime"
          >
            <CartIcon />
            {cartCount > 0 ? (
              <span key={cartCount} className="cart-pop absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-lime px-1 text-[0.7rem] font-extrabold leading-none text-brand-ink">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t('switchLanguage')}
            lang={locale === 'ar' ? 'en' : 'ar'}
            className="h-10 min-w-10 rounded-lg border border-white/25 px-3 text-sm font-bold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-lime"
          >
            {locale === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button
            ref={menuButton}
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-lime lg:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t('navMenuClose') : t('navMenuOpen')}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-menu" aria-label={t('navMain')} className="border-t border-white/10 bg-brand-ink lg:hidden">
          <ul className="container-xl flex flex-col py-2">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-3 text-base font-medium transition hover:bg-white/5 ${
                      active ? 'bg-white/5 text-brand-lime' : 'text-brand-bone/90'
                    }`}
                  >
                    {t(n.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
