'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import { ArrowIcon, CalendarIcon, CheckCircleIcon } from '@/components/ui/Icons';
import HomeImage from '@/components/home/HomeImage';

/** Entrance-animation delay for `.hero-rise` (see the hero block in globals.css). */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

export default function Hero() {
  const { t } = useLocale();
  const trust = [t('trustCatalog'), t('trustBooking'), t('trustListings')];
  const sectionRef = useRef<HTMLElement>(null);
  const carRef = useRef<HTMLDivElement>(null);

  // Subtle car parallax (pointer on desktop, scroll everywhere) and pausing of the looping light effects
  // while the hero is off screen. Skipped entirely when the user prefers reduced motion.
  useEffect(() => {
    const section = sectionRef.current;
    const car = carRef.current;
    if (!section || !car) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let px = 0;
    let py = 0;
    let scroll = 0;
    let visible = true;

    const paint = () => {
      frame = 0;
      car.style.transform = `translate3d(${px.toFixed(1)}px, ${(py + scroll).toFixed(1)}px, 0) scale(1.06)`;
    };
    const schedule = () => {
      if (!frame && visible && !reduce.matches) frame = requestAnimationFrame(paint);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || reduce.matches) return;
      const r = section.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * -18;
      py = ((e.clientY - r.top) / r.height - 0.5) * -10;
      schedule();
    };
    const onPointerLeave = () => {
      px = 0;
      py = 0;
      schedule();
    };
    const onScroll = () => {
      scroll = Math.min(window.scrollY, 600) * 0.06;
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      section.dataset.heroPaused = visible ? 'false' : 'true';
    });

    observer.observe(section);
    section.addEventListener('pointermove', onPointerMove, { passive: true });
    section.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-brand-navy text-white lg:min-h-[44rem]">
      {/* Photo: stacked above the text on mobile, on the end side (left in RTL) on desktop. It fades into the navy. */}
      <div className="hero-photo-mask relative z-0 aspect-[16/10] w-full lg:absolute lg:inset-y-0 lg:end-0 lg:aspect-auto lg:w-[72%]">
        <div className="hero-car-in absolute inset-0">
          <div
            ref={carRef}
            className="absolute inset-0 will-change-transform transition-transform duration-300 ease-out"
            style={{ transform: 'scale(1.06)' }}
          >
            <HomeImage slot="hero" className="h-full w-full" />
          </div>
        </div>
      </div>

      {/* Desktop navy scrim: opaque on the text side, clear toward the car. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 hidden bg-linear-to-r from-brand-navy from-[28%] via-brand-navy/55 via-[42%] to-transparent to-[58%] rtl:bg-linear-to-l lg:block"
      />

      {/* Orange light: a pulsing glow under the car and two light streaks that travel along the floor and corner. */}
      <div
        aria-hidden="true"
        className="hero-glow pointer-events-none absolute bottom-6 end-[6%] z-10 hidden h-56 w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(249_115_22/0.34),transparent)] blur-2xl lg:block"
      />
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        className="hero-lights pointer-events-none absolute inset-0 z-10 hidden h-full w-full lg:block"
      >
        <defs>
          <linearGradient id="hero-light" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#f97316" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fb923c" stopOpacity="0.95" />
            <stop offset="1" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hero-edge" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M610 0 L480 600" stroke="url(#hero-edge)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
        <path
          className="hero-streak"
          d="M0 470 C130 520 300 560 520 585"
          stroke="url(#hero-light)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="hero-streak hero-streak-2"
          d="M700 600 C820 590 930 540 1000 470"
          stroke="url(#hero-light)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="container-xl relative z-20 -mt-6 flex items-center pb-12 sm:pb-14 lg:mt-0 lg:min-h-[44rem] lg:py-20">
        <div className="max-w-2xl lg:max-w-xl xl:max-w-[38rem]">
          <p
            className="hero-rise inline-flex items-center gap-2 rounded-full border border-brand-orange/50 bg-brand-orange/15 px-4 py-1.5 text-sm font-bold text-orange-300 sm:text-base"
            style={delay(100)}
          >
            <span className="h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
            {t('heroEyebrow')}
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.2] tracking-tight text-white sm:text-5xl xl:text-6xl">
            <span className="hero-rise block" style={delay(220)}>
              {t('heroHeadline1')}
            </span>
            <span className="hero-rise relative mt-1 inline-block text-brand-orange" style={delay(340)}>
              {t('heroHeadline2')}
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 320 14"
                preserveAspectRatio="none"
                className="hero-swoosh pointer-events-none absolute -bottom-3 end-0 h-3 w-[45%]"
              >
                <defs>
                  <linearGradient id="hero-swoosh-grad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#f97316" stopOpacity="0" />
                    <stop offset="0.35" stopColor="#fb923c" stopOpacity="1" />
                    <stop offset="1" stopColor="#f97316" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <path d="M2 11 C70 3 190 2 318 8" stroke="url(#hero-swoosh-grad)" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </span>
          </h1>
          <p className="hero-rise mt-7 max-w-xl text-lg leading-relaxed text-slate-200 sm:text-xl" style={delay(480)}>
            {t('heroDesc')}
          </p>

          <div className="hero-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={delay(600)}>
            <ButtonLink href="#services" size="lg" className="hero-cta hero-cta-primary px-8 shadow-lg shadow-brand-orange/30">
              {t('heroCtaPrimary')}
              <ArrowIcon className="hero-cta-icon" width={18} height={18} />
            </ButtonLink>
            <ButtonLink href="/booking" variant="onDark" size="lg" className="hero-cta hero-cta-ghost bg-white/5 px-8 backdrop-blur-sm">
              <CalendarIcon className="hero-cta-icon" width={18} height={18} />
              {t('heroCtaSecondary')}
            </ButtonLink>
          </div>

          <ul
            className="hero-rise mt-9 flex flex-col divide-y divide-white/15 border-y border-white/15 text-base text-slate-100 sm:flex-row sm:divide-x sm:divide-y-0 lg:w-[calc(100%+3rem)]"
            style={delay(740)}
          >
            {trust.map((label) => (
              <li key={label} className="flex items-center gap-2 whitespace-nowrap py-3 text-[15px] sm:px-4 sm:first:ps-0 sm:last:pe-0">
                <CheckCircleIcon className="shrink-0 text-brand-orange" width={20} height={20} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scroll cue (desktop) */}
      <a
        href="#services"
        aria-label={t('heroScroll')}
        className="hero-rise absolute inset-x-0 bottom-5 z-20 mx-auto hidden w-fit rounded-full p-1 text-white/80 transition-colors hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange lg:block"
        style={delay(1100)}
      >
        <span className="hero-bob flex flex-col items-center gap-1" aria-hidden="true">
          <svg width="22" height="34" viewBox="0 0 22 34" fill="none" focusable="false">
            <rect x="1" y="1" width="20" height="32" rx="10" stroke="currentColor" strokeWidth="1.6" />
            <rect className="hero-wheel" x="9.5" y="7" width="3" height="7" rx="1.5" fill="currentColor" />
          </svg>
          <svg width="18" height="16" viewBox="0 0 18 16" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <path d="M3 2l6 5 6-5M3 9l6 5 6-5" />
          </svg>
        </span>
      </a>
    </section>
  );
}
