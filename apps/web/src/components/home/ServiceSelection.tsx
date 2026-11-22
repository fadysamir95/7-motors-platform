'use client';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import { ArrowIcon, CarIcon, PartsIcon, WrenchIcon } from '@/components/ui/Icons';
import HomeImage from '@/components/home/HomeImage';
import type { TranslationKey } from '@/lib/i18n';
import type { HomeImageSlotKey } from '@/lib/home-images';

const SERVICES: {
  slot: HomeImageSlotKey;
  href: string;
  icon: typeof CarIcon;
  title: TranslationKey;
  desc: TranslationKey;
  cta: TranslationKey;
}[] = [
  { slot: 'parts', href: '/vehicles', icon: PartsIcon, title: 'svcPartsTitle', desc: 'svcPartsDesc', cta: 'svcPartsCta' },
  { slot: 'booking', href: '/booking', icon: WrenchIcon, title: 'svcBookTitle', desc: 'svcBookDesc', cta: 'svcBookCta' },
  { slot: 'sell', href: '/marketplace', icon: CarIcon, title: 'svcSellTitle', desc: 'svcSellDesc', cta: 'svcSellCta' },
];

export default function ServiceSelection() {
  const { t } = useLocale();
  return (
    <section id="services" aria-labelledby="services-title" className="container-xl scroll-mt-20 py-16 md:py-20">
      <div className="mb-12 text-center">
        <h2 id="services-title" className="text-3xl font-extrabold text-brand-navy md:text-4xl">{t('servicesTitle')}</h2>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-brand-orange" aria-hidden="true" />
        <p className="mt-4 text-lg text-slate-600">{t('servicesSubtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        {SERVICES.map((s) => (
          <article
            key={s.slot}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(15_31_61/0.06),0_12px_28px_-14px_rgb(15_31_61/0.25)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_2px_4px_rgb(15_31_61/0.08),0_24px_44px_-18px_rgb(15_31_61/0.4)]"
          >
            <div className="relative">
              <HomeImage slot={s.slot} className="aspect-[16/11] w-full" imgClassName="transition duration-700 group-hover:scale-105" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/40 to-transparent" />
              <div className="absolute -bottom-6 start-6 grid h-12 w-12 place-items-center rounded-xl bg-brand-orange text-white shadow-lg shadow-brand-orange/30 ring-4 ring-card">
                <s.icon width={24} height={24} />
              </div>
            </div>
            <div className="flex flex-1 flex-col px-6 pb-6 pt-10">
              <h3 className="text-xl font-bold text-brand-navy">{t(s.title)}</h3>
              <p className="mt-2 flex-1 text-base leading-relaxed text-slate-600">{t(s.desc)}</p>
              <div className="mt-6">
                <ButtonLink href={s.href} variant="secondary" className="w-full sm:w-auto">
                  {t(s.cta)}
                  <ArrowIcon width={16} height={16} />
                </ButtonLink>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
