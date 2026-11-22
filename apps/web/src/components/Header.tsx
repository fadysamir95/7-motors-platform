'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { Button } from '@/components/ui/Button';

export default function Header() {
  const { t, locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: '/vehicles', label: t('spareParts') },
    { href: '/booking', label: t('bookService') },
    { href: '/marketplace', label: t('sellCar') },
    { href: '/wholesale', label: t('wholesale') },
  ];
  return (
    <header className="sticky top-0 z-40 bg-brand-navy text-white shadow-md">
      <div className="container-xl flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight">7 <span className="text-brand-orange">MOTORS</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {nav.map((n) => <Link key={n.href} href={n.href} className="hover:text-brand-orange">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/cart" className="hover:text-brand-orange text-sm hidden sm:inline">{t('cart')}</Link>
          <Link href="/admin" className="hover:text-brand-orange text-sm hidden sm:inline">{t('admin')}</Link>
          <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>
            {locale === 'ar' ? 'EN' : 'AR'}
          </Button>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white" />
          </button>
        </div>
      </div>
      {open ? (
        <div className="md:hidden border-t border-white/10 bg-brand-navy">
          <nav className="container-xl py-4 flex flex-col gap-3">
            {nav.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="hover:text-brand-orange">{n.label}</Link>)}
            <Link href="/cart" onClick={() => setOpen(false)} className="hover:text-brand-orange">{t('cart')}</Link>
            <Link href="/admin" onClick={() => setOpen(false)} className="hover:text-brand-orange">{t('admin')}</Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
