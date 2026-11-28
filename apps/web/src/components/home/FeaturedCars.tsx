'use client';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatNumber, formatPrice } from '@/lib/format';
import type { ListingCard } from '@/lib/mock-listings'; // type only: erased at build, the data file is not bundled
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { ArrowIcon, CarIcon, FuelIcon, GaugeIcon, TransmissionIcon } from '@/components/ui/Icons';
import type { TranslationKey } from '@/lib/i18n';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: ListingCard[]; sample: boolean };

const LIMIT = 4;

/**
 * Sample listings are a development-only preview. They are only ever used when NODE_ENV is "development",
 * so a production build can never show fabricated cars (the dynamic import below is dead code there).
 * Set NEXT_PUBLIC_USE_MOCK_LISTINGS=false in apps/web/.env.local to turn them off in development as well.
 */
const SAMPLES_ENABLED =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK_LISTINGS !== 'false';

const VALUE_LABELS: Record<string, TranslationKey> = {
  automatic: 'valAutomatic',
  manual: 'valManual',
  petrol: 'valPetrol',
  gasoline: 'valPetrol',
  diesel: 'valDiesel',
  hybrid: 'valHybrid',
  electric: 'valElectric',
};

async function loadSamples(): Promise<ListingCard[]> {
  if (!SAMPLES_ENABLED) return [];
  const { mockListings } = await import('@/lib/mock-listings');
  return mockListings.slice(0, LIMIT);
}

export default function FeaturedCars() {
  const { t, locale } = useLocale();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const done = (s: State) => !cancelled && setState(s);
    apiGet(`/marketplace/listings?limit=${LIMIT}`)
      .then(async (d) => {
        const items: ListingCard[] = (d.items || []).slice(0, LIMIT);
        if (items.length > 0) return done({ status: 'ready', items, sample: false });
        const samples = await loadSamples();
        done({ status: 'ready', items: samples, sample: samples.length > 0 });
      })
      .catch(async () => {
        const samples = await loadSamples();
        done(samples.length > 0 ? { status: 'ready', items: samples, sample: true } : { status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const label = (v?: string) => {
    if (!v) return undefined;
    const key = VALUE_LABELS[v.trim().toLowerCase()];
    return key ? t(key) : v;
  };

  return (
    <section aria-labelledby="cars-title" className="bg-card py-16 md:py-20">
      <div className="container-xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="cars-title" className="font-display text-3xl font-extrabold text-brand-ink md:text-4xl">{t('carsTitle')}</h2>
            <div className="mt-3 h-1 w-14 rounded-full bg-brand-lime-dark" aria-hidden="true" />
            <p className="mt-4 text-lg text-slate-600">{t('carsSubtitle')}</p>
          </div>
          {state.status === 'ready' && state.items.length > 0 ? (
            <Link href="/marketplace" className="inline-flex items-center gap-2 text-base font-bold text-brand-ink underline decoration-brand-lime-dark decoration-2 underline-offset-4 hover:decoration-brand-ink">
              {t('carsViewAll')}
              <ArrowIcon width={16} height={16} />
            </Link>
          ) : null}
        </div>

        {state.status === 'ready' && state.sample ? (
          <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
            {t('carsSampleNotice')}
          </p>
        ) : null}

        {state.status === 'loading' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: LIMIT }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border">
                <Skeleton className="aspect-[4/3] rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-7 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {state.status === 'error' ? (
          <Message title={t('carsErrorTitle')} role="alert">
            <Button variant="secondary" onClick={retry}>{t('carsRetry')}</Button>
          </Message>
        ) : null}

        {state.status === 'ready' && state.items.length === 0 ? (
          <Message title={t('carsEmptyTitle')} desc={t('carsEmptyDesc')}>
            <ButtonLink href="/marketplace/new">
              {t('carsEmptyCta')}
              <ArrowIcon width={16} height={16} />
            </ButtonLink>
          </Message>
        ) : null}

        {state.status === 'ready' && state.items.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {state.items.map((l) => {
              const title = l.model?.name?.startsWith('Renault') ? l.model.name : `Renault ${l.model?.name ?? ''}`.trim();
              const photo = l.images?.[0];
              const specs = [
                { icon: GaugeIcon, text: `${formatNumber(l.mileage, locale)} ${t('km')}` },
                { icon: TransmissionIcon, text: label(l.transmission) },
                { icon: FuelIcon, text: label(l.fuelType) },
              ].filter((s) => s.text);
              // Sample cards never link to a (non-existent) listing page.
              const href = state.sample ? '/marketplace' : `/marketplace/${l.id}`;
              return (
                <li key={l.id}>
                  <Link
                    href={href}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(30_31_28/0.06),0_12px_28px_-14px_rgb(30_31_28/0.25)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_2px_4px_rgb(30_31_28/0.08),0_24px_44px_-18px_rgb(30_31_28/0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {photo?.url ? (
                        photo.url.startsWith('/') ? (
                          <Image
                            src={photo.url}
                            alt={title}
                            fill
                            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                            placeholder={photo.blur ? 'blur' : 'empty'}
                            blurDataURL={photo.blur}
                            className="object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          // User-supplied listing photo from an arbitrary host, so next/image's remotePatterns can't be known.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.url}
                            alt={title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        )
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-brand-ink text-white/30" aria-hidden="true">
                          <CarIcon width={56} height={56} strokeWidth={1.2} />
                        </div>
                      )}
                      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/35 to-transparent" />
                      <span className="absolute start-3 top-3 rounded-full bg-brand-ink px-3 py-1 text-sm font-bold text-brand-bone shadow">
                        {l.year}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-bold leading-snug text-brand-ink">{title}</h3>
                      <p className="mt-2 text-2xl text-brand-ink" dir="ltr" style={{ textAlign: 'start' }}>
                        <PriceText value={formatPrice(l.price, locale)} />
                      </p>
                      <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-sm text-slate-700">
                        {specs.map(({ icon: Icon, text }) => (
                          <li key={text} className="flex flex-col items-center gap-1.5 text-center">
                            <Icon width={20} height={20} className="text-brand-ink" />
                            <span className="leading-tight">{text}</span>
                          </li>
                        ))}
                      </ul>
                      <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-ink px-4 py-2.5 text-center text-base font-semibold text-brand-bone transition group-hover:bg-brand-lime group-hover:text-brand-ink">
                        {t('carsViewDetails')}
                        <ArrowIcon width={16} height={16} />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/** Digits use Exo 2 Black Italic (brand numerals). The Arabic currency label keeps the body font, since italic Arabic would be synthesised. */
function PriceText({ value }: { value: string }) {
  return (
    <>
      {value.split(/(\d[\d,]*)/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-price text-[1.15em]">{part}</span>
        ) : (
          <span key={i} className="font-extrabold">{part}</span>
        ),
      )}
    </>
  );
}

function Message({
  title,
  desc,
  role,
  children,
}: {
  title: string;
  desc?: string;
  role?: 'alert';
  children: React.ReactNode;
}) {
  return (
    <div role={role} className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-ink text-brand-lime" aria-hidden="true">
        <CarIcon width={28} height={28} />
      </div>
      <h3 className="mt-5 text-lg font-bold text-brand-ink">{title}</h3>
      {desc ? <p className="mt-1 text-slate-600">{desc}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}
