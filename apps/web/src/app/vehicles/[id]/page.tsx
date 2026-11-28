'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { addToCart as addToCartApi } from '@/lib/cart';
import { showToast } from '@/lib/toast';
import { formatPrice } from '@/lib/format';
import { useLocale } from '@/components/LocaleProvider';
import { Badge, Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import VehicleImage from '@/components/VehicleImage';
import PartsRequestDialog from '@/components/PartsRequestDialog';
import PartDetailsDialog, { type PartProduct } from '@/components/PartDetailsDialog';
import { CartIcon, CheckIcon, CloseIcon, PartsIcon, SearchIcon } from '@/components/ui/Icons';
import CarLoader from '@/components/ui/CarLoader';

type Product = PartProduct;
type VehicleModel = { id: string; slug: string; name: string };
type Result = { filterKey: string; page: number; items: Product[]; total: number; failed: boolean };

const PAGE_SIZE = 24;
const FIRST_YEAR = 2010;
const SEARCH_DELAY_MS = 350;

/** Spare parts for the chosen vehicle. All compatible parts show straight away; the year only narrows them. */
export default function VehiclePartsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { t, locale } = useLocale();

  const [model, setModel] = useState<VehicleModel | null>(null);
  const [year, setYear] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cartState, setCartState] = useState<Record<string, 'adding' | 'added'>>({});
  const [requestOpen, setRequestOpen] = useState(false);
  const [openPart, setOpenPart] = useState<Product | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - FIRST_YEAR + 1 }, (_, i) => current - i);
  }, []);

  useEffect(() => {
    if (!id) return;
    apiGet(`/vehicles/${id}`).then(setModel).catch(() => setModel(null));
  }, [id]);

  // The search box updates instantly; the request only fires once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterKey = `${id}|${year}|${search}|${attempt}`;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const qs = new URLSearchParams({ modelId: id, limit: String(PAGE_SIZE), page: String(page) });
    if (year) qs.set('year', year);
    if (search) qs.set('search', search);
    apiGet(`/products?${qs.toString()}`)
      .then((d) => {
        if (cancelled) return;
        const items: Product[] = d.items || [];
        setResult((prev) => ({
          filterKey,
          page,
          items: page > 1 && prev?.filterKey === filterKey ? [...prev.items, ...items] : items,
          total: d.total ?? items.length,
          failed: false,
        }));
      })
      .catch(() => {
        if (!cancelled) setResult({ filterKey, page, items: [], total: 0, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id, year, search, page, attempt, filterKey]);

  const loadingFirst = result?.filterKey !== filterKey;
  const loadingMore = !loadingFirst && result !== null && result.page !== page;
  const items = loadingFirst ? [] : result?.items ?? [];
  const total = loadingFirst ? 0 : result?.total ?? 0;
  const filtered = Boolean(year || search);

  const productName = (p: Product) =>
    p.translations?.find((x) => x.locale === locale)?.name || p.translations?.[0]?.name || p.sku;

  const clearCartState = (id: string) =>
    setCartState((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== id)));

  const addToCart = async (p: Product, quantity = 1) => {
    if (cartState[p.id] === 'adding') return;
    setCartState((s) => ({ ...s, [p.id]: 'adding' }));
    try {
      await addToCartApi(p.id, quantity);
      setCartState((s) => ({ ...s, [p.id]: 'added' }));
      showToast({ message: t('cartAddedToast').replace('{name}', productName(p)), href: '/cart', actionLabel: t('partsViewCart') });
      setTimeout(() => clearCartState(p.id), 2200);
    } catch {
      clearCartState(p.id);
      showToast({ message: t('partsAddFailed'), tone: 'error' });
    }
  };

  const resetFilters = () => {
    setYear('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const countLabel = total === 1 ? t('partsCountOne') : t('partsCount').replace('{n}', String(total));
  const vehicleName = model?.name ?? '';

  return (
    <div>
      <section aria-labelledby="parts-title" className="bg-brand-ink text-brand-bone">
        <div className="container-xl py-6 md:py-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {model ? (
                <VehicleImage slug={model.slug} name={model.name} sizes="128px" className="h-16 w-24 shrink-0 rounded-xl md:h-20 md:w-32" />
              ) : (
                <Skeleton className="h-16 w-24 shrink-0 rounded-xl md:h-20 md:w-32" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-lime">{t('partsEyebrow')}</p>
                <h1 id="parts-title" className="font-display truncate text-2xl font-extrabold md:text-3xl">{vehicleName || '…'}</h1>
                <Link
                  href="/vehicles"
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-bone/80 underline underline-offset-4 transition hover:text-brand-lime focus-visible:outline-2 focus-visible:outline-brand-lime"
                >
                  {t('partsChange')}
                </Link>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <div role="search" className="relative sm:w-72">
                <label htmlFor="parts-search" className="sr-only">{t('partsSearchLabel')}</label>
                <SearchIcon width={20} height={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/60" />
                <input suppressHydrationWarning
                  id="parts-search"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="h-12 w-full rounded-xl border border-transparent bg-brand-bone ps-12 pe-11 text-base text-brand-ink placeholder:text-brand-ink/50 [&::-webkit-search-cancel-button]:hidden focus:outline-none focus:ring-2 focus:ring-brand-lime"
                  placeholder={t('partsSearchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    aria-label={t('vehClear')}
                    className="absolute end-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-brand-ink/70 transition hover:bg-brand-ink/10 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink"
                  >
                    <CloseIcon width={18} height={18} />
                  </button>
                ) : null}
              </div>
              <div>
                <label htmlFor="parts-year" className="sr-only">{t('partsYearLabel')}</label>
                <select suppressHydrationWarning
                  id="parts-year"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 w-full rounded-xl border border-transparent bg-brand-bone px-4 text-base font-semibold text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime sm:w-44"
                >
                  <option value="">{t('partsAllYears')}</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-xl py-8 md:py-10">
        {!loadingFirst && !result?.failed && items.length > 0 ? (
          <p className="mb-4 text-sm text-muted" aria-live="polite">{countLabel}</p>
        ) : null}

        {loadingFirst ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)}
          </div>
        ) : null}

        {!loadingFirst && result?.failed ? (
          <Notice icon={<PartsIcon width={26} height={26} />} title={t('partsErrorTitle')} role="alert">
            <Button onClick={() => setAttempt((n) => n + 1)}>{t('partsRetry')}</Button>
          </Notice>
        ) : null}

        {!loadingFirst && !result?.failed && items.length === 0 ? (
          <Notice icon={<PartsIcon width={26} height={26} />} title={t('partsEmptyTitle')} desc={t('partsEmptyDesc')}>
            <div className="flex flex-wrap justify-center gap-3">
              {filtered ? <Button variant="secondary" onClick={resetFilters}>{t('partsReset')}</Button> : null}
              <Button onClick={() => setRequestOpen(true)}>{t('partsMissingCta')}</Button>
            </div>
          </Notice>
        ) : null}

        {!loadingFirst && items.length > 0 ? (
          <>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {items.map((p) => {
                const stock = p.inventory?.stock ?? 0;
                const inStock = stock > 0;
                const photo = p.images?.[0]?.url;
                const state = cartState[p.id];
                return (
                  <li key={p.id} className="flex">
                    <article
                      onClick={() => setOpenPart(p)}
                      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-ink/30 hover:shadow-[0_14px_30px_-16px_rgb(30_31_28/0.35)]"
                    >
                      <div className="relative aspect-square bg-slate-100">
                        {photo ? (
                          // Part photos come from arbitrary hosts, so next/image's remotePatterns can't be known.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={productName(p)}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-slate-400" role="img" aria-label={t('partsNoImage')}>
                            <PartsIcon width={44} height={44} strokeWidth={1.3} />
                          </div>
                        )}
                        <span className="absolute start-3 top-3">
                          <Badge tone={inStock ? 'green' : 'red'}>{inStock ? t('available') : t('outOfStock')}</Badge>
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h2 className="min-h-[2.75rem] text-base font-bold leading-snug text-brand-ink">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenPart(p); }}
                            aria-haspopup="dialog"
                            aria-label={`${t('pdOpenDetails')}: ${productName(p)}`}
                            className="line-clamp-2 w-full text-start underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                          >
                            {productName(p)}
                          </button>
                        </h2>
                        <dl className="mt-2 space-y-0.5 text-sm text-muted">
                          {p.partCode ? (
                            <div className="flex gap-1.5">
                              <dt>{t('partsCode')}:</dt>
                              <dd className="font-semibold text-slate-700" dir="ltr">{p.partCode}</dd>
                            </div>
                          ) : null}
                          {p.countryOfOrigin ? (
                            <div className="flex gap-1.5">
                              <dt>{t('countryOfOrigin')}:</dt>
                              <dd>{p.countryOfOrigin}</dd>
                            </div>
                          ) : null}
                        </dl>
                        <p className="mt-3 text-xl text-brand-ink" dir="ltr" style={{ textAlign: 'start' }}>
                          <PriceText value={formatPrice(p.price, locale)} />
                        </p>
                        <Button
                          className={`mt-3 w-full whitespace-nowrap px-3 ${state === 'added' ? 'bg-brand-ink text-brand-bone hover:bg-brand-ink' : ''}`}
                          disabled={!inStock || state === 'adding'}
                          aria-busy={state === 'adding'}
                          onClick={(e) => { e.stopPropagation(); void addToCart(p); }}
                        >
                          {state === 'adding' ? (
                            <>
                              <CarLoader size="xs" tone="ink" className="[&>svg]:w-9" />
                              {t('cartAdding')}
                            </>
                          ) : state === 'added' ? (
                            <>
                              <CheckIcon width={18} height={18} className="text-brand-lime" />
                              {t('cartAddedShort')}
                            </>
                          ) : (
                            <>
                              <CartIcon width={18} height={18} />
                              {t('addToCart')}
                            </>
                          )}
                        </Button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>

            {items.length < total ? (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" size="lg" disabled={loadingMore} onClick={() => setPage((n) => n + 1)}>
                  {t('partsLoadMore')}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}

        {!loadingFirst && !result?.failed ? (
          <aside aria-labelledby="parts-missing" className="mt-12 flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <h2 id="parts-missing" className="text-lg font-extrabold text-brand-ink md:text-xl">{t('partsMissingTitle')}</h2>
              <p className="mt-1 text-muted">{t('partsMissingDesc')}</p>
            </div>
            <Button size="lg" className="shrink-0 self-start md:self-auto" onClick={() => setRequestOpen(true)}>{t('partsMissingCta')}</Button>
          </aside>
        ) : null}
      </div>

      {openPart ? (
        <PartDetailsDialog
          product={openPart}
          adding={cartState[openPart.id] === 'adding'}
          added={cartState[openPart.id] === 'added'}
          onAdd={(qty) => void addToCart(openPart, qty)}
          onClose={() => setOpenPart(null)}
        />
      ) : null}

      {requestOpen ? <PartsRequestDialog models={model ? [model] : []} defaultModelId={model?.id} onClose={() => setRequestOpen(false)} /> : null}
    </div>
  );
}

/** Digits use Exo 2 Black Italic (brand numerals); the Arabic currency label keeps the body font. */
function PriceText({ value }: { value: string }) {
  return (
    <>
      {value.split(/(\d[\d,]*)/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-price text-[1.1em]">{part}</span>
        ) : (
          <span key={i} className="font-extrabold">{part}</span>
        ),
      )}
    </>
  );
}

function Notice({
  icon,
  title,
  desc,
  role,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  role?: 'alert';
  children?: React.ReactNode;
}) {
  return (
    <div role={role} className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-card px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-ink text-brand-lime" aria-hidden="true">{icon}</div>
      <h2 className="mt-5 text-lg font-bold text-brand-ink">{title}</h2>
      {desc ? <p className="mt-1 text-muted">{desc}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
