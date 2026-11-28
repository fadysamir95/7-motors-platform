'use client';
import { useLocale } from '@/components/LocaleProvider';
import { CalendarIcon, CarIcon, ListIcon, BoxIcon } from '@/components/ui/Icons';
import type { TranslationKey } from '@/lib/i18n';

// Each point reflects functionality that exists in the project today.
const POINTS: { icon: typeof CarIcon; title: TranslationKey; desc: TranslationKey }[] = [
  { icon: ListIcon, title: 'whyCatalogTitle', desc: 'whyCatalogDesc' },
  { icon: CalendarIcon, title: 'whyBookingTitle', desc: 'whyBookingDesc' },
  { icon: BoxIcon, title: 'whyWholesaleTitle', desc: 'whyWholesaleDesc' },
  { icon: CarIcon, title: 'whyReviewedTitle', desc: 'whyReviewedDesc' },
];

export default function WhyMotors() {
  const { t } = useLocale();
  return (
    <section aria-labelledby="why-title" className="relative isolate overflow-hidden bg-brand-ink py-16 text-brand-bone md:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_80%_at_0%_50%,rgb(198_245_63/0.07),transparent_60%)]" />
      <div className="container-xl">
        <div className="mb-10 text-center">
          <h2 id="why-title" className="font-display text-3xl font-extrabold md:text-4xl">{t('whyTitle')}</h2>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-brand-lime" aria-hidden="true" />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-brand-lime/40 hover:bg-white/[0.07]">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-lime/15 text-brand-lime">
                <Icon width={24} height={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold">{t(title)}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-slate-300">{t(desc)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
