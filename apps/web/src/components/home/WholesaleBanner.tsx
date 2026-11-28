'use client';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import { ArrowIcon, BoxIcon } from '@/components/ui/Icons';
import HomeImage from '@/components/home/HomeImage';

/** Dedicated B2B promo. The CTA goes straight to the existing wholesale request form (/wholesale). */
export default function WholesaleBanner() {
  const { t } = useLocale();
  // Slanted edge on the photo's inner side. Mirrors automatically in RTL.
  const slant = '[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)] rtl:[clip-path:polygon(0_0,100%_0,86%_100%,0_100%)]';
  return (
    <section aria-labelledby="wholesale-title" className="container-xl pb-16 md:pb-20">
      <div className="relative isolate overflow-hidden rounded-3xl bg-brand-ink text-brand-bone shadow-[0_24px_60px_-24px_rgb(30_31_28/0.7)]">
        {/* mobile: photo on top */}
        <div className="relative md:hidden">
          <HomeImage slot="wholesale" className="aspect-[16/9] w-full" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-brand-ink to-transparent" />
        </div>
        {/* desktop: photo on the end side with a slanted edge and an lime accent behind it */}
        <div aria-hidden="true" className={`absolute inset-y-0 end-0 hidden w-[54%] bg-brand-lime md:block ${slant}`} />
        <div className={`absolute inset-y-0 end-0 hidden w-[52%] md:block ${slant}`}>
          <HomeImage slot="wholesale" className="h-full w-full" />
          <div aria-hidden="true" className="absolute inset-0 bg-brand-ink/20" />
        </div>

        <div className="relative z-10 flex flex-col gap-5 px-6 pb-10 pt-4 sm:px-10 md:w-[55%] md:py-14 md:pe-0 lg:px-14 lg:py-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-lime/15 px-4 py-1.5 text-sm font-bold text-brand-lime ring-1 ring-brand-lime/40 sm:text-base">
            <BoxIcon width={18} height={18} />
            {t('wsEyebrow')}
          </span>
          <h2 id="wholesale-title" className="font-display text-3xl font-extrabold leading-tight text-brand-bone md:text-4xl lg:text-5xl">{t('wsTitle')}</h2>
          <p className="max-w-lg text-lg leading-relaxed text-slate-200">{t('wsDesc')}</p>
          <div className="mt-2">
            <ButtonLink href="/wholesale" size="lg" className="px-8 shadow-lg shadow-brand-lime/30">
              {t('wsCta')}
              <ArrowIcon width={18} height={18} />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
