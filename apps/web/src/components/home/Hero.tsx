'use client';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import { ArrowIcon, CalendarIcon, CheckCircleIcon } from '@/components/ui/Icons';
import HomeImage from '@/components/home/HomeImage';

export default function Hero() {
  const { t } = useLocale();
  const trust = [t('trustCatalog'), t('trustBooking'), t('trustListings')];

  return (
    <section className="relative isolate overflow-hidden bg-brand-navy text-white">
      {/* Photo sits on the end side on desktop (full-bleed behind the text on mobile) */}
      <div className="absolute inset-0 -z-20 lg:inset-y-0 lg:start-auto lg:end-0 lg:w-[68%]">
        <HomeImage slot="hero" className="h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 bg-brand-navy/25" />
      </div>
      {/* Navy scrim: protects text contrast. Opaque on the text side, clear toward the car. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-brand-navy via-brand-navy/80 to-brand-navy/55 lg:bg-linear-to-r lg:from-brand-navy lg:from-[34%] lg:via-brand-navy/70 lg:via-[52%] lg:to-transparent rtl:lg:bg-linear-to-l"
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-linear-to-t from-black/40 to-transparent" />

      <div className="container-xl flex min-h-[34rem] items-center py-14 sm:min-h-[38rem] lg:min-h-[40rem] lg:py-20">
        <div className="max-w-2xl lg:max-w-xl xl:max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-orange/50 bg-brand-orange/15 px-4 py-1.5 text-sm font-bold text-orange-300 sm:text-base">
            <span className="h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
            {t('heroEyebrow')}
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.2] tracking-tight text-white sm:text-5xl xl:text-6xl">
            {t('heroHeadline1')}
            <span className="mt-1 block text-brand-orange">{t('heroHeadline2')}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-200 sm:text-xl">{t('heroDesc')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href="#services" size="lg" className="px-8 shadow-lg shadow-brand-orange/30">
              {t('heroCtaPrimary')}
              <ArrowIcon width={18} height={18} />
            </ButtonLink>
            <ButtonLink href="/booking" variant="onDark" size="lg" className="bg-white/5 px-8 backdrop-blur-sm">
              <CalendarIcon width={18} height={18} />
              {t('heroCtaSecondary')}
            </ButtonLink>
          </div>

          <ul className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 text-base text-slate-100 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {trust.map((label) => (
              <li key={label} className="flex items-center gap-2">
                <CheckCircleIcon className="shrink-0 text-brand-orange" width={20} height={20} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
