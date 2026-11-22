'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { MailIcon, PhoneIcon, PinIcon } from '@/components/ui/Icons';
import { siteConfig } from '@/lib/site-config';
import type { TranslationKey } from '@/lib/i18n';

const LINKS: { href: string; label: TranslationKey }[] = [
  { href: '/', label: 'home' },
  { href: '/vehicles', label: 'spareParts' },
  { href: '/booking', label: 'bookService' },
  { href: '/marketplace', label: 'navMarketplace' },
  { href: '/wholesale', label: 'wholesale' },
];

export default function Footer() {
  const { t } = useLocale();
  // Contact details are shown only when configured (see lib/site-config.ts); never placeholders.
  const contacts = [
    siteConfig.phone && { icon: PhoneIcon, label: t('footerPhone'), value: siteConfig.phone, href: `tel:${siteConfig.phone.replace(/\s/g, '')}`, ltr: true },
    siteConfig.email && { icon: MailIcon, label: t('footerEmail'), value: siteConfig.email, href: `mailto:${siteConfig.email}`, ltr: true },
    siteConfig.address && { icon: PinIcon, label: t('footerAddress'), value: siteConfig.address, href: undefined, ltr: false },
  ].filter(Boolean) as { icon: typeof PhoneIcon; label: string; value: string; href?: string; ltr: boolean }[];

  return (
    <footer className="bg-brand-navy text-slate-300">
      <div className={`container-xl grid gap-10 py-14 ${contacts.length ? 'md:grid-cols-[1.4fr_1fr_1fr]' : 'md:grid-cols-[1.4fr_1fr]'}`}>
        <div>
          <Image src="/brand/logo.webp" alt="7 MOTORS" width={640} height={229} sizes="168px" className="h-14 w-auto" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed">{t('footerAbout')}</p>
        </div>

        <nav aria-label={t('footerLinks')}>
          <h2 className="mb-4 font-bold text-white">{t('footerLinks')}</h2>
          <ul className="space-y-2.5 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-brand-orange">{t(l.label)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {contacts.length ? (
          <div>
            <h2 className="mb-4 font-bold text-white">{t('footerContact')}</h2>
            <ul className="space-y-3 text-sm">
              {contacts.map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <c.icon className="mt-0.5 shrink-0 text-brand-orange" width={18} height={18} />
                  {c.href ? (
                    <a href={c.href} dir={c.ltr ? 'ltr' : undefined} className="transition hover:text-brand-orange">{c.value}</a>
                  ) : (
                    <span>{c.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-400">
        © 7 MOTORS. {t('footerRights')}.
      </div>
    </footer>
  );
}
