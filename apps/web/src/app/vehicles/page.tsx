'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import { Skeleton } from '@/components/ui/Feedback';
import { ArrowIcon, CheckIcon, CloseIcon, SearchIcon } from '@/components/ui/Icons';
import VehicleImage from '@/components/VehicleImage';

type Generation = { startYear: number; endYear?: number | null };
type VehicleModel = { id: string; slug: string; name: string; sortOrder?: number; generations?: Generation[] };

const RECENT_KEY = 'recentVehicle';
const SIZES = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';

/** Entrance timing for `.veh-rise` (see the vehicle selection block in globals.css). */
const rise = (index: number, delayMs = 0) => ({ '--i': index, '--d': `${delayMs}ms` }) as CSSProperties;

/** Lower-case and drop the shared "Renault" prefix so "duster" and "renault duster" both match. */
const normalize = (s: string) => s.toLowerCase().replace(/^renault\s+/, '').trim();

function readRecent(): string | null {
  try {
    return localStorage.getItem(RECENT_KEY);
  } catch {
    return null;
  }
}

function writeRecent(id: string) {
  try {
    localStorage.setItem(RECENT_KEY, id);
  } catch {
    // Storage can be blocked (private mode); remembering the vehicle is only a convenience.
  }
}

/** The last word of the title is picked out in lime ("Renault", "سيارتك"). */
function splitTitle(title: string): [string, string] {
  const i = title.lastIndexOf(' ');
  return i < 0 ? ['', title] : [title.slice(0, i), title.slice(i + 1)];
}

export default function VehiclesPage() {
  const { t } = useLocale();
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [recentId, setRecentId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the search box (the usual shortcut on catalog sites), unless the user is already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    apiGet('/vehicles?active=true')
      .then((d) => setModels(Array.isArray(d) ? d : d.items || []))
      .catch(() => setModels([]))
      .finally(() => {
        // Read after the first paint: localStorage does not exist during server rendering.
        setRecentId(readRecent());
        setLoading(false);
      });
  }, []);

  const q = normalize(query);
  const filtered = useMemo(
    () => (q ? models.filter((m) => normalize(m.name).includes(q) || m.slug.includes(q)) : models),
    [models, q],
  );
  const recent = !q ? models.find((m) => m.id === recentId) : undefined;

  const choose = (m: VehicleModel) => {
    // The selected look is only feedback while the next page loads, so it clears itself and never lingers.
    setSelected(m.id);
    writeRecent(m.id);
    setTimeout(() => setSelected((cur) => (cur === m.id ? null : cur)), 2500);
  };

  const countLabel = filtered.length === 1 ? t('vehCountOne') : t('vehCount').replace('{n}', String(filtered.length));
  const [titleHead, titleAccent] = splitTitle(t('vehTitle'));

  return (
    <div>
      {/* Hero: intro, search and the model count share one compact band. */}
      <section aria-labelledby="veh-title" className="relative isolate overflow-hidden bg-brand-ink text-brand-bone">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 1000 320"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full rtl:-scale-x-100"
        >
          <defs>
            <linearGradient id="veh-light" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#c6f53f" stopOpacity="0" />
              <stop offset="0.6" stopColor="#c6f53f" stopOpacity="0.5" />
              <stop offset="1" stopColor="#c6f53f" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="veh-streak" pathLength="1" d="M380 320 C560 300 780 210 1000 40" stroke="url(#veh-light)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
          <path className="veh-streak veh-streak-2" pathLength="1" d="M620 320 C780 310 900 250 1000 170" stroke="url(#veh-light)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" opacity="0.6" />
        </svg>
        {/* Soft pool of light behind the stat, like headlights on a wall. */}
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 end-[-6rem] -z-10 hidden h-80 w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(198_245_63/0.12),transparent)] lg:block" />

        <div className="container-xl grid gap-8 pb-14 pt-8 md:pb-16 md:pt-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div>
            <ol
              className="veh-rise flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold"
              style={rise(0)}
              aria-label={t('vehStep1') + ' → ' + t('vehStep2')}
            >
              <li className="inline-flex items-center gap-2 text-brand-lime" aria-current="step">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-lime text-xs font-extrabold text-brand-ink">1</span>
                {t('vehStep1')}
              </li>
              <li aria-hidden="true" className="h-px w-6 bg-brand-bone/30" />
              <li className="inline-flex items-center gap-2 text-brand-bone/60">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-brand-bone/35 text-xs font-extrabold">2</span>
                {t('vehStep2')}
              </li>
            </ol>

            <h1 id="veh-title" className="veh-rise font-display mt-4 text-4xl font-extrabold leading-[1.15] md:text-5xl" style={rise(0, 80)}>
              {titleHead ? `${titleHead} ` : null}
              <span className="text-brand-lime">{titleAccent}</span>
            </h1>
            <p className="veh-rise mt-3 max-w-xl text-base text-brand-bone/75 md:text-lg" style={rise(0, 160)}>{t('vehSubtitle')}</p>

            <div role="search" className="veh-rise mt-6 max-w-xl" style={rise(0, 240)}>
              <label htmlFor="veh-search" className="sr-only">{t('vehSearchLabel')}</label>
              <div className="veh-search relative rounded-2xl bg-brand-bone">
                <SearchIcon width={22} height={22} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-brand-ink/60" />
                <input suppressHydrationWarning
                  id="veh-search"
                  ref={searchRef}
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="h-14 w-full rounded-2xl bg-transparent ps-14 pe-14 text-base font-medium text-brand-ink placeholder:font-normal placeholder:text-brand-ink/50 [&::-webkit-search-cancel-button]:hidden focus:outline-none md:text-lg"
                  placeholder={t('vehSearchPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    aria-label={t('vehClear')}
                    className="absolute end-2.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-brand-ink/70 transition hover:bg-brand-ink/10 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink"
                  >
                    <CloseIcon width={18} height={18} />
                  </button>
                ) : (
                  <kbd aria-hidden="true" className="pointer-events-none absolute end-4 top-1/2 hidden h-7 min-w-7 -translate-y-1/2 place-items-center rounded-md border border-brand-ink/20 px-2 font-mono text-xs font-semibold text-brand-ink/50 md:grid">/</kbd>
                )}
              </div>
            </div>
          </div>

          <div className="veh-rise hidden lg:block" style={rise(0, 320)} aria-hidden={loading}>
            <p className="font-price text-7xl leading-none text-brand-lime">{loading ? '' : models.length}</p>
            <p className="mt-2 border-t border-brand-bone/20 pt-3 text-sm font-bold text-brand-bone/70">{t('vehStatLabel')}</p>
          </div>
        </div>
      </section>

      {/* Recently selected: a floating card that overlaps the hero, so returning customers can continue in one tap. */}
      {recent ? (
        <div className="container-xl relative z-10 -mt-7">
          <Link
            href={`/vehicles/${recent.id}`}
            onClick={() => choose(recent)}
            aria-label={`${t('vehContinue')}: ${recent.name}`}
            className="veh-continue veh-rise group flex items-center gap-4 rounded-2xl border border-border bg-card p-2.5 pe-4 shadow-[0_18px_40px_-20px_rgb(30_31_28/0.5)] transition hover:border-brand-ink/40 hover:shadow-[0_22px_44px_-20px_rgb(30_31_28/0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink md:max-w-xl"
            style={rise(0, 380)}
          >
            <VehicleImage
              slug={recent.slug}
              name={recent.name}
              sizes="160px"
              tone="dark"
              className="h-16 w-24 shrink-0 rounded-xl md:h-[4.5rem] md:w-28"
              imgClassName="transition duration-500 group-hover:scale-[1.06]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-muted">{t('vehContinueFor')}</span>
              <span className="mt-0.5 block truncate text-lg font-extrabold text-brand-ink">{recent.name}</span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-brand-ink/70">{t('vehContinue')}</span>
            </span>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-lime text-brand-ink transition group-hover:bg-brand-ink group-hover:text-brand-lime">
              <ArrowIcon width={18} height={18} className="veh-arrow" />
            </span>
          </Link>
        </div>
      ) : null}

      <div className="container-xl pb-10 pt-8 md:pb-14 md:pt-10">
        {/* Catalog header: heading, live count and the active search read as one line. */}
        {!loading && filtered.length > 0 ? (
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 md:mb-6">
            <h2 className="text-xl font-extrabold text-brand-ink md:text-2xl">{q ? t('vehResults') : t('vehAll')}</h2>
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand-ink px-2 text-sm text-brand-bone" aria-hidden="true">
              <span className="font-price">{filtered.length}</span>
            </span>
            <span className="sr-only" role="status" aria-live="polite">{countLabel}</span>
            {q ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('vehClear')}
                className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-border bg-card py-1 ps-3 pe-2 text-sm font-semibold text-brand-ink transition hover:border-brand-ink/40 focus-visible:outline-2 focus-visible:outline-brand-ink"
              >
                <span className="truncate" dir="auto">“{query.trim()}”</span>
                <CloseIcon width={14} height={14} className="shrink-0" />
              </button>
            ) : null}
            <span className="hidden h-px min-w-8 flex-1 bg-border sm:block" aria-hidden="true" />
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />)}
          </div>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {filtered.map((m, i) => {
              const isSelected = selected === m.id;
              const title = m.name.replace(/^Renault\s+/i, '');
              const gens = m.generations ?? [];
              const years = gens.length
                ? `${Math.min(...gens.map((g) => g.startYear))} – ${gens.some((g) => !g.endYear) ? t('vehPresent') : Math.max(...gens.map((g) => g.endYear ?? 0))}`
                : null;
              return (
                <li key={m.id} className="veh-rise" style={rise(i)}>
                  <Link
                    href={`/vehicles/${m.id}`}
                    onClick={() => choose(m)}
                    aria-label={`${t('vehSelect')}: ${m.name}`}
                    aria-busy={isSelected}
                    className={`veh-card group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink ${
                      isSelected ? 'ring-2 ring-brand-ink ring-offset-2 ring-offset-background' : ''
                    }`}
                  >
                    <div className="absolute inset-0">
                      <VehicleImage
                        slug={m.slug}
                        name={m.name}
                        sizes={SIZES}
                        tone="dark"
                        className="h-full w-full"
                        imgClassName="transition duration-700 ease-out group-hover:scale-[1.07]"
                      />
                    </div>
                    {/* Legibility scrim: deeper at the bottom where the name sits, and a touch deeper on hover. */}
                    <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-brand-ink/90 via-brand-ink/20 to-transparent transition-opacity duration-300 group-hover:opacity-100" />
                    <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1 origin-center bg-brand-lime transition-transform duration-300 ${isSelected ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />

                    {isSelected ? (
                      <span className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-brand-lime text-brand-ink shadow">
                        <CheckIcon width={18} height={18} strokeWidth={2.5} />
                      </span>
                    ) : null}

                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 md:p-5">
                      <div className="min-w-0 text-brand-bone">
                        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-brand-bone/70 md:text-xs">Renault</span>
                        <h3 className="mt-0.5 truncate text-lg font-extrabold leading-tight md:text-2xl">{title}</h3>
                        {years ? <p className="mt-0.5 text-xs text-brand-bone/70 md:text-sm" dir="ltr" style={{ textAlign: 'start' }}>{years}</p> : null}
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brand-bone/30 bg-brand-bone/10 text-brand-bone backdrop-blur-sm transition duration-300 group-hover:border-brand-lime group-hover:bg-brand-lime group-hover:text-brand-ink md:h-11 md:w-11">
                        <ArrowIcon width={18} height={18} className="veh-arrow" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <div className="veh-rise relative isolate mx-auto max-w-2xl overflow-hidden rounded-3xl bg-brand-ink px-6 py-14 text-center text-brand-bone" style={rise(0)}>
            {/* Concentric rings, like a parking sensor: a quiet automotive nod instead of a stock illustration. */}
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-8 -z-10 h-28 w-28 -translate-x-1/2 rounded-full border border-brand-lime/30" />
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-2 -z-10 h-40 w-40 -translate-x-1/2 rounded-full border border-brand-lime/15" />
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-lime text-brand-ink" aria-hidden="true">
              <SearchIcon width={28} height={28} />
            </div>
            {models.length === 0 ? (
              <>
                <h2 className="mt-6 text-xl font-extrabold md:text-2xl">{t('vehEmptyTitle')}</h2>
                <p className="mx-auto mt-2 max-w-md text-brand-bone/75">{t('vehEmptyDesc')}</p>
              </>
            ) : (
              <>
                <h2 className="mt-6 text-xl font-extrabold md:text-2xl" dir="auto">{t('vehNoneTitle').replace('{q}', query.trim())}</h2>
                <p className="mx-auto mt-2 max-w-md text-brand-bone/75">{t('vehNoneDesc')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-lime px-6 py-3 font-semibold text-brand-ink transition hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime"
                >
                  {t('vehNoneCta')}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
