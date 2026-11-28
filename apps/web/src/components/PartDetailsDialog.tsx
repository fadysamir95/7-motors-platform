'use client';
import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { useLocale } from '@/components/LocaleProvider';
import { Badge } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import CarLoader from '@/components/ui/CarLoader';
import PriceText from '@/components/PriceText';
import { CartIcon, CheckIcon, CloseIcon, PartsIcon } from '@/components/ui/Icons';

export type PartProduct = {
  id: string;
  sku: string;
  partCode?: string | null;
  oemReference?: string | null;
  brand?: string | null;
  countryOfOrigin?: string | null;
  price: string | number;
  translations?: { locale: string; name: string; description?: string | null }[];
  images?: { url: string }[];
  inventory?: { stock: number; reserved?: number } | null;
  compatibility?: { model?: { name: string } | null; years?: { year: number }[] }[];
};

const MAX_QTY = 99;

/** Collapses [2012, 2013, 2014, 2018] into "2012–2014, 2018". */
function yearRanges(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j > i ? `${sorted[i]}–${sorted[j]}` : String(sorted[i]));
    i = j + 1;
  }
  return parts.join(', ');
}

/**
 * Everything about one part that the card has no room for: gallery, description, brand and references,
 * compatible vehicles, and an add-to-cart with a quantity. Mount it only while it should be open.
 */
export default function PartDetailsDialog({
  product,
  adding,
  added,
  onAdd,
  onClose,
}: {
  product: PartProduct;
  adding: boolean;
  added: boolean;
  onAdd: (quantity: number) => void;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  // The list endpoint has no category, the single-product endpoint does.
  useEffect(() => {
    let alive = true;
    apiGet(`/products/${product.id}`)
      .then((full) => {
        const tr = full?.category?.translations as { locale: string; name: string }[] | undefined;
        if (alive) setCategory(tr?.find((x) => x.locale === locale)?.name ?? tr?.[0]?.name ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [product.id, locale]);

  const tr = product.translations?.find((x) => x.locale === locale) ?? product.translations?.[0];
  const name = tr?.name || product.sku;
  const description = tr?.description?.trim();
  const images = product.images ?? [];
  const available = product.inventory ? Math.max(0, product.inventory.stock - (product.inventory.reserved ?? 0)) : 0;
  const inStock = available > 0;
  const maxQty = Math.min(MAX_QTY, Math.max(1, available));

  const specs: { label: string; value: React.ReactNode }[] = [
    ...(product.brand ? [{ label: t('pdBrand'), value: product.brand }] : []),
    ...(category ? [{ label: t('pdCategory'), value: category }] : []),
    ...(product.partCode ? [{ label: t('partsCode'), value: <span dir="ltr">{product.partCode}</span> }] : []),
    ...(product.oemReference ? [{ label: t('pdOem'), value: <span dir="ltr">{product.oemReference}</span> }] : []),
    { label: t('pdSku'), value: <span dir="ltr">{product.sku}</span> },
    ...(product.countryOfOrigin ? [{ label: t('countryOfOrigin'), value: product.countryOfOrigin }] : []),
  ];

  // Models that fit for the same years are listed together, so a part that fits everything reads as one line.
  const compatGroups = Object.values(
    (product.compatibility ?? [])
      .filter((c) => c.model?.name)
      .reduce<Record<string, { years: string; names: string[] }>>((groups, c) => {
        const years = yearRanges((c.years ?? []).map((y) => y.year));
        (groups[years] ??= { years, names: [] }).names.push(c.model!.name);
        return groups;
      }, {}),
  );
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      aria-labelledby="pd-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-3xl bg-background p-0 text-foreground shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop:bg-brand-ink/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative grid gap-0 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <button
          type="button"
          onClick={close}
          aria-label={t('prClose')}
          className="absolute end-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-brand-bone/90 text-brand-ink shadow transition hover:bg-brand-bone focus-visible:outline-2 focus-visible:outline-brand-ink"
        >
          <CloseIcon width={18} height={18} />
        </button>

        {/* gallery */}
        <div className="bg-slate-100 p-4 md:p-5">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-card">
            {images[photo]?.url ? (
              // Part photos come from arbitrary hosts, so next/image's remotePatterns can't be known.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[photo].url} alt={name} referrerPolicy="no-referrer" className="h-full w-full object-contain" />
            ) : (
              <div className="grid h-full w-full place-items-center text-slate-400" role="img" aria-label={t('partsNoImage')}>
                <PartsIcon width={72} height={72} strokeWidth={1.1} />
              </div>
            )}
          </div>
          {images.length > 1 ? (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <li key={img.url + i}>
                  <button
                    type="button"
                    onClick={() => setPhoto(i)}
                    aria-label={t('pdPhoto').replace('{n}', String(i + 1))}
                    aria-current={i === photo}
                    className={`block aspect-square w-full overflow-hidden rounded-lg border-2 bg-card transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink ${i === photo ? 'border-brand-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* info */}
        <div className="flex flex-col p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2 pe-12">
            <Badge tone={inStock ? 'green' : 'red'}>{inStock ? t('available') : t('outOfStock')}</Badge>
            {inStock && available <= 5 ? <span className="text-sm font-semibold text-red-700">{t('pdStockLeft').replace('{n}', String(available))}</span> : null}
          </div>
          <h2 id="pd-title" className="mt-3 text-2xl font-extrabold leading-snug text-brand-ink">{name}</h2>
          <p className="mt-2 text-3xl text-brand-ink" dir="ltr" style={{ textAlign: 'start' }}>
            <PriceText value={formatPrice(product.price, locale)} />
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-border bg-card">
              <button
                type="button"
                aria-label={t('cartDec')}
                disabled={quantity <= 1 || !inStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="grid h-11 w-11 place-items-center rounded-xl text-brand-ink transition hover:bg-brand-ink/10 focus-visible:outline-2 focus-visible:outline-brand-ink disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
              </button>
              <span className="min-w-10 text-center font-extrabold text-brand-ink" aria-live="polite">{quantity}</span>
              <button
                type="button"
                aria-label={t('cartInc')}
                disabled={quantity >= maxQty || !inStock}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                className="grid h-11 w-11 place-items-center rounded-xl text-brand-ink transition hover:bg-brand-ink/10 focus-visible:outline-2 focus-visible:outline-brand-ink disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>
              </button>
            </div>
            <Button
              className={`min-w-0 flex-1 whitespace-nowrap py-3 ${added ? 'bg-brand-ink text-brand-bone hover:bg-brand-ink' : ''}`}
              disabled={!inStock || adding}
              aria-busy={adding}
              onClick={() => onAdd(quantity)}
            >
              {adding ? (
                <>
                  <CarLoader size="xs" className="[&>svg]:w-9" />
                  {t('cartAdding')}
                </>
              ) : added ? (
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

          {description ? (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-brand-ink">{t('pdDescription')}</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{description}</p>
            </div>
          ) : null}

          <div className="mt-4">
            <h3 className="text-sm font-bold text-brand-ink">{t('pdSpecs')}</h3>
            <dl className="mt-2 divide-y divide-border rounded-xl border border-border bg-card text-sm">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted">{s.label}</dt>
                  <dd className="text-end font-semibold text-brand-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {compatGroups.length ? (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-brand-ink">{t('pdCompat')}</h3>
              <div className="mt-2 space-y-3">
                {compatGroups.map((g) => (
                  <div key={g.years || 'all'}>
                    {g.years ? <p className="text-xs font-semibold text-muted" dir="ltr" style={{ textAlign: 'start' }}>{g.years}</p> : null}
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {g.names.map((n) => (
                        <li key={n} className="rounded-lg border border-border bg-card px-2.5 py-1 text-sm font-bold text-brand-ink" dir="ltr">{n.replace(/^Renaults+/i, '')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </dialog>
  );
}
