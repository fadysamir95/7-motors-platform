'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

/** Entrance delay for `.svc-card` (see the services block in globals.css). */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/**
 * Three static service cards (not a slider). The cards stay visible without JavaScript; once mounted, cards that
 * are below the fold are hidden and then revealed one after another as the section scrolls into view.
 */
export default function ServiceSelection() {
  const { t } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<'idle' | 'armed' | 'shown'>('idle');
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        setPhase((p) => (entry.isIntersecting ? 'shown' : p === 'idle' ? 'armed' : p));
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      aria-labelledby="services-title"
      data-phase={phase}
      data-paused={!inView}
      className="svc-section relative isolate mb-12 scroll-mt-20 overflow-hidden py-16 text-white md:mb-16 md:py-24"
    >
      {/* Decorative light and watermark */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1000 400"
        preserveAspectRatio="none"
        className="svc-lights pointer-events-none absolute inset-0 -z-10 h-full w-full"
      >
        <defs>
          <linearGradient id="svc-light" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#f97316" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fb923c" stopOpacity="0.95" />
            <stop offset="1" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Faint full arcs, with a brighter highlight travelling along each */}
        <path d="M0 150 C170 105 310 45 450 0" stroke="url(#svc-light)" strokeOpacity="0.3" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M560 400 C760 385 900 345 1000 295" stroke="url(#svc-light)" strokeOpacity="0.3" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
        <path className="svc-streak" d="M0 150 C170 105 310 45 450 0" stroke="url(#svc-light)" strokeWidth="2" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path className="svc-streak svc-streak-2" d="M560 400 C760 385 900 345 1000 295" stroke="url(#svc-light)" strokeWidth="2" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 120"
        className="pointer-events-none absolute end-[6%] top-8 -z-10 hidden h-40 w-auto text-white/[0.07] md:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      >
        <path d="M50 4 L96 60 L50 116 L4 60 Z" />
        <path d="M50 28 L76 60 L50 92 L24 60 Z" />
      </svg>

      <div className="container-xl">
        <div className="mb-12 text-center md:mb-14">
          <div className="mb-4 flex items-center justify-center gap-3" aria-hidden="true">
            <span className="h-px w-10 bg-brand-orange/70" />
            <span className="h-2 w-2 rotate-45 bg-brand-orange" />
            <span className="h-px w-10 bg-brand-orange/70" />
          </div>
          <h2 id="services-title" className="text-4xl font-extrabold text-white md:text-5xl">{t('servicesTitle')}</h2>
          <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-brand-orange" aria-hidden="true" />
          <p className="mt-5 text-lg text-slate-300">{t('servicesSubtitle')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {SERVICES.map((s, i) => (
            <article key={s.slot} className="svc-card group flex flex-col" style={delay(i * 150)}>
              <div className="svc-media relative">
                <HomeImage
                  slot={s.slot}
                  className="aspect-[16/10] w-full"
                  imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.08] group-focus-within:scale-[1.08]"
                />
                <span className="svc-badge absolute -bottom-7 start-6 grid h-14 w-14 place-items-center rounded-2xl bg-brand-orange text-white">
                  <s.icon width={26} height={26} />
                </span>
              </div>
              <div className="flex flex-1 flex-col px-6 pb-7 pt-11">
                <h3 className="text-2xl font-bold text-white">{t(s.title)}</h3>
                <p className="mt-3 flex-1 text-base leading-relaxed text-slate-300">{t(s.desc)}</p>
                <ButtonLink href={s.href} variant="onDark" size="lg" className="svc-cta mt-7 w-full self-center sm:w-auto sm:min-w-[13rem]">
                  {t(s.cta)}
                  <ArrowIcon className="svc-cta-icon" width={16} height={16} />
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
