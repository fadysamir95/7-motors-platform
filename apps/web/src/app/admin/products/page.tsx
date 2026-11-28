'use client';
import { useEffect, useState } from 'react';
import { apiDelete, apiGet } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { showToast } from '@/lib/toast';
import { useLocale } from '@/components/LocaleProvider';
import { Badge, Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { PartsIcon, SearchIcon, CloseIcon } from '@/components/ui/Icons';
import ProductEditorDialog, { type CategoryOption, type ModelOption } from '@/components/admin/ProductEditorDialog';
import StockDialog from '@/components/admin/StockDialog';
import ImportDialog from '@/components/admin/ImportDialog';

type Row = {
  id: string;
  sku: string;
  partCode?: string | null;
  price: string | number;
  isActive: boolean;
  isPublished: boolean;
  translations?: { locale: string; name: string }[];
  images?: { url: string }[];
  inventory?: { stock: number; reserved: number; lowStockThreshold: number } | null;
  category?: { translations?: { locale: string; name: string }[] } | null;
  _count?: { compatibility: number };
};
type Result = { key: string; items: Row[]; total: number; totalPages: number; failed: boolean };
type Status = '' | 'active' | 'unpublished' | 'inactive';

const LIMIT = 20;
const SEARCH_DELAY_MS = 350;

const control = 'h-11 rounded-xl border border-border bg-card px-3.5 text-base text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40';

export default function AdminProductsPage() {
  const { t, locale } = useLocale();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [stockFor, setStockFor] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiGet('/vehicles?active=true').then((d) => alive && setModels(Array.isArray(d) ? d : d.items ?? [])).catch(() => undefined);
    apiGet('/categories').then((d) => alive && setCategories(Array.isArray(d) ? d : [])).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // The search box updates instantly; the request waits for a pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const key = [search, categoryId, status, lowStock, page, reload].join('|');
  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) qs.set('search', search);
    if (categoryId) qs.set('categoryId', categoryId);
    if (status) qs.set('status', status);
    if (lowStock) qs.set('lowStock', 'true');
    apiGet(`/admin/products?${qs.toString()}`)
      .then((d) => alive && setResult({ key, items: d.items ?? [], total: d.total ?? 0, totalPages: d.totalPages ?? 1, failed: false }))
      .catch(() => alive && setResult({ key, items: [], total: 0, totalPages: 1, failed: true }));
    return () => {
      alive = false;
    };
    // `key` already covers every input of the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loading = result?.key !== key;
  const items = loading ? [] : result?.items ?? [];
  const refresh = () => setReload((n) => n + 1);

  const nameOf = (r: Row) => {
    const tr = r.translations?.find((x) => x.locale === locale) ?? r.translations?.[0];
    return tr?.name || t('apNameFallback');
  };
  const categoryOf = (r: Row) => r.category?.translations?.find((x) => x.locale === locale)?.name ?? r.category?.translations?.[0]?.name;

  const statusBadge = (r: Row) =>
    !r.isActive ? <Badge tone="red">{t('apStatusInactive')}</Badge> : !r.isPublished ? <Badge tone="gray">{t('apStatusUnpublished')}</Badge> : <Badge tone="green">{t('apStatusActive')}</Badge>;

  const stockBadge = (r: Row) => {
    const inv = r.inventory;
    if (!inv) return <span className="text-muted">—</span>;
    const low = inv.stock <= inv.lowStockThreshold;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2">
        <span className={`text-lg font-extrabold ${inv.stock === 0 ? 'text-red-700' : low ? 'text-amber-700' : 'text-brand-ink'}`} dir="ltr">{inv.stock}</span>
        {inv.reserved > 0 ? <span className="text-xs text-muted">{t('apReserved').replace('{n}', String(inv.reserved))}</span> : null}
      </span>
    );
  };

  const remove = async (r: Row) => {
    try {
      await apiDelete(`/products/${r.id}`);
      showToast({ message: t('apDeleted') });
      setConfirmId(null);
      refresh();
    } catch (e) {
      setConfirmId(null);
      const forbidden = e instanceof Error && /"statusCode":403/.test(e.message);
      showToast({ message: forbidden ? t('apDeleteForbidden') : t('apDeleteBlocked'), tone: 'error' });
    }
  };

  const filtered = Boolean(search || categoryId || status || lowStock);
  const reset = () => {
    setSearchInput('');
    setSearch('');
    setCategoryId('');
    setStatus('');
    setLowStock(false);
    setPage(1);
  };

  const actions = (r: Row) =>
    confirmId === r.id ? (
      <span className="inline-flex items-center gap-2 text-sm font-bold">
        <span className="text-red-800">{t('apConfirmDelete').replace('{name}', nameOf(r))}</span>
        <button type="button" onClick={() => void remove(r)} className="rounded-lg bg-red-700 px-3 py-1.5 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">{t('apDelete')}</button>
        <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg border border-border px-3 py-1.5 text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink">{t('apCancel')}</button>
      </span>
    ) : (
      <span className="inline-flex flex-wrap items-center gap-2 text-sm font-bold">
        <button type="button" onClick={() => setEditing({ id: r.id })} className="rounded-lg border border-border px-3 py-1.5 text-brand-ink transition hover:border-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink">{t('apEdit')}</button>
        <button type="button" onClick={() => setStockFor(r)} className="rounded-lg border border-border px-3 py-1.5 text-brand-ink transition hover:border-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink">{t('apColStock')}</button>
        <button type="button" onClick={() => setConfirmId(r.id)} className="rounded-lg px-3 py-1.5 text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700">{t('apDelete')}</button>
      </span>
    );

  const thumb = (r: Row) =>
    r.images?.[0]?.url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={r.images[0].url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-cover" />
    ) : (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400" aria-hidden="true"><PartsIcon width={22} height={22} strokeWidth={1.4} /></span>
    );

  return (
    <div className="container-xl py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand-ink md:text-3xl">{t('apTitle')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImporting(true)}>{t('apImport')}</Button>
          <Button onClick={() => setEditing({ id: null })}>+ {t('apAdd')}</Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <div role="search" className="relative min-w-56 flex-1">
          <label htmlFor="ap-search" className="sr-only">{t('apSearch')}</label>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-brand-ink/50" />
          <input suppressHydrationWarning id="ap-search" type="search" autoComplete="off" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('apSearch')} className={`${control} w-full ps-10 [&::-webkit-search-cancel-button]:hidden`} />
        </div>
        <select suppressHydrationWarning aria-label={t('apCategory')} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className={control}>
          <option value="">{t('apAllCategories')}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.translations?.find((x) => x.locale === locale)?.name ?? c.translations?.[0]?.name ?? c.slug}</option>)}
        </select>
        <select suppressHydrationWarning aria-label={t('apColStatus')} value={status} onChange={(e) => { setStatus(e.target.value as Status); setPage(1); }} className={control}>
          <option value="">{t('apStatusAll')}</option>
          <option value="active">{t('apStatusActive')}</option>
          <option value="unpublished">{t('apStatusUnpublished')}</option>
          <option value="inactive">{t('apStatusInactive')}</option>
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-brand-ink">
          <input suppressHydrationWarning type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} className="h-5 w-5 accent-[var(--ink)]" />
          {t('apLowStock')}
        </label>
        {filtered ? (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-bold text-brand-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-ink">
            <CloseIcon width={14} height={14} />
            {t('partsReset')}
          </button>
        ) : null}
      </div>

      {!loading && !result?.failed ? <p className="mt-4 text-sm text-muted" aria-live="polite">{t('apResults').replace('{n}', String(result?.total ?? 0))}</p> : null}

      {loading ? (
        <div className="mt-4 space-y-2" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : null}

      {!loading && result?.failed ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-5 text-center font-semibold text-red-800">{t('apLoadError')}</p> : null}

      {!loading && !result?.failed && items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-card p-10 text-center">
          <p className="text-lg font-extrabold text-brand-ink">{t('apNoResults')}</p>
          <p className="mt-1 text-muted">{t('apNoResultsHint')}</p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          {/* desktop table */}
          <div className="mt-3 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-100 text-xs font-bold text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start">{t('apColPart')}</th>
                  <th scope="col" className="px-4 py-3 text-start">{t('apColPrice')}</th>
                  <th scope="col" className="px-4 py-3 text-start">{t('apColStock')}</th>
                  <th scope="col" className="px-4 py-3 text-start">{t('apColStatus')}</th>
                  <th scope="col" className="px-4 py-3 text-start">{t('apColActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((r) => (
                  <tr key={r.id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {thumb(r)}
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-bold text-brand-ink">{nameOf(r)}</p>
                          <p className="text-xs text-muted" dir="ltr" style={{ textAlign: 'start' }}>{r.sku}{r.partCode ? ` · ${r.partCode}` : ''}</p>
                          <p className="text-xs text-muted">
                            {[categoryOf(r), r._count?.compatibility ? t('apVehiclesCount').replace('{n}', String(r._count.compatibility)) : t('apNoVehicles')].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-brand-ink" dir="ltr" style={{ textAlign: 'start' }}>{formatPrice(r.price, locale)}</td>
                    <td className="px-4 py-3">{stockBadge(r)}</td>
                    <td className="px-4 py-3">{statusBadge(r)}</td>
                    <td className="px-4 py-3">{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <ul className="mt-3 space-y-3 md:hidden">
            {items.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-3.5">
                <div className="flex items-start gap-3">
                  {thumb(r)}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-snug text-brand-ink">{nameOf(r)}</p>
                    <p className="text-xs text-muted" dir="ltr" style={{ textAlign: 'start' }}>{r.sku}</p>
                  </div>
                  {statusBadge(r)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-brand-ink" dir="ltr">{formatPrice(r.price, locale)}</span>
                  {stockBadge(r)}
                </div>
                <div className="mt-3 border-t border-border pt-3">{actions(r)}</div>
              </li>
            ))}
          </ul>

          {(result?.totalPages ?? 1) > 1 ? (
            <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('apPrev')}</Button>
              <span className="text-sm font-bold text-brand-ink">{t('apPageOf').replace('{a}', String(page)).replace('{b}', String(result?.totalPages ?? 1))}</span>
              <Button variant="outline" disabled={page >= (result?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>{t('apNext')}</Button>
            </nav>
          ) : null}
        </>
      ) : null}

      {editing ? (
        <ProductEditorDialog
          productId={editing.id}
          models={models}
          categories={categories}
          onSaved={() => {
            setEditing(null);
            showToast({ message: t('apSaved') });
            refresh();
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {stockFor ? (
        <StockDialog
          product={{ id: stockFor.id, name: nameOf(stockFor), stock: stockFor.inventory?.stock ?? 0, reserved: stockFor.inventory?.reserved ?? 0 }}
          onDone={() => {
            setStockFor(null);
            showToast({ message: t('apStockDone') });
            refresh();
          }}
          onClose={() => setStockFor(null)}
        />
      ) : null}

      {importing ? <ImportDialog onDone={refresh} onClose={() => setImporting(false)} /> : null}
    </div>
  );
}
