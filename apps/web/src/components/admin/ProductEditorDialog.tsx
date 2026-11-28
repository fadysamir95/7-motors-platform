'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatYears, parseYears } from '@/lib/years';
import { useLocale } from '@/components/LocaleProvider';
import Modal from '@/components/ui/Modal';
import CarLoader from '@/components/ui/CarLoader';
import { CloseIcon } from '@/components/ui/Icons';

export type ModelOption = { id: string; name: string };
export type CategoryOption = { id: string; slug: string; translations?: { locale: string; name: string }[] };

type FullProduct = {
  id: string;
  sku: string;
  partCode?: string | null;
  oemReference?: string | null;
  brand?: string | null;
  countryOfOrigin?: string | null;
  categoryId?: string | null;
  price: string | number;
  isActive: boolean;
  isPublished: boolean;
  translations?: { locale: string; name: string; description?: string | null }[];
  images?: { url: string }[];
  compatibility?: { modelId: string; years?: { year: number }[] }[];
};

type CompatRow = { key: number; modelId: string; years: string };
type Form = {
  sku: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  partCode: string;
  oemReference: string;
  brand: string;
  countryOfOrigin: string;
  categoryId: string;
  price: string;
  stock: string;
  isPublished: boolean;
  isActive: boolean;
  images: string[];
  compat: CompatRow[];
};

const empty: Form = {
  sku: '', nameAr: '', nameEn: '', descAr: '', descEn: '', partCode: '', oemReference: '', brand: '', countryOfOrigin: '',
  categoryId: '', price: '', stock: '0', isPublished: true, isActive: true, images: [], compat: [],
};

const input = 'mt-1.5 h-11 w-full rounded-xl border bg-card px-3.5 text-base text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40';
const textarea = 'mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-base text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40';

let rowKey = 0;
const toForm = (p: FullProduct): Form => {
  const tr = (locale: string) => p.translations?.find((x) => x.locale === locale);
  return {
    sku: p.sku, nameAr: tr('ar')?.name ?? '', nameEn: tr('en')?.name ?? '', descAr: tr('ar')?.description ?? '', descEn: tr('en')?.description ?? '',
    partCode: p.partCode ?? '', oemReference: p.oemReference ?? '', brand: p.brand ?? '', countryOfOrigin: p.countryOfOrigin ?? '',
    categoryId: p.categoryId ?? '', price: String(Number(p.price)), stock: '0', isPublished: p.isPublished, isActive: p.isActive,
    images: (p.images ?? []).map((i) => i.url),
    compat: (p.compatibility ?? []).map((c) => ({ key: ++rowKey, modelId: c.modelId, years: formatYears((c.years ?? []).map((y) => y.year)) })),
  };
};

function statusOf(e: unknown): number | null {
  try {
    return JSON.parse(e instanceof Error ? e.message : '').statusCode ?? null;
  } catch {
    return null;
  }
}

/**
 * Create or edit one spare part: names, codes, price, category, compatible vehicles with their years, image links
 * and visibility. For an existing part the full record is loaded first. Stock is set here only as opening stock for
 * a new part; later changes go through the stock dialog so every change leaves a movement record.
 */
export default function ProductEditorDialog({
  productId,
  models,
  categories,
  onSaved,
  onClose,
}: {
  productId: string | null;
  models: ModelOption[];
  categories: CategoryOption[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(productId !== null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let alive = true;
    // Staff endpoint: the public one hides parts that are inactive or unpublished, which are exactly the ones staff edit.
    apiGet(`/admin/products/${productId}`)
      .then((p: FullProduct) => alive && (setForm(toForm(p)), setLoading(false)))
      .catch(() => alive && (setLoadFailed(true), setLoading(false)));
    return () => {
      alive = false;
    };
  }, [productId]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)));
  };
  const categoryName = (c: CategoryOption) => c.translations?.find((x) => x.locale === locale)?.name ?? c.translations?.[0]?.name ?? c.slug;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.sku.trim()) next.sku = t('apErrSku');
    if (!form.nameAr.trim() && !form.nameEn.trim()) next.nameAr = t('apErrName');
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(form.price.trim())) next.price = t('apErrPrice');
    const seen = new Set<string>();
    for (const row of form.compat) {
      if (!row.modelId) next.compat = t('apErrModelChoose');
      else if (seen.has(row.modelId)) next.compat = t('apErrModelTwice');
      else if (!parseYears(row.years)) next.compat = t('apErrYearsFormat');
      seen.add(row.modelId);
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`pe-${first}`)?.focus();
    return !first;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setProblem(null);
    const translations = [
      { locale: 'ar', name: form.nameAr.trim(), description: form.descAr.trim() },
      { locale: 'en', name: form.nameEn.trim(), description: form.descEn.trim() },
    ]
      .filter((x) => x.name)
      .map((x) => ({ locale: x.locale, name: x.name, ...(x.description ? { description: x.description } : {}) }));
    const body = {
      sku: form.sku.trim(),
      partCode: form.partCode.trim(),
      oemReference: form.oemReference.trim(),
      brand: form.brand.trim(),
      countryOfOrigin: form.countryOfOrigin.trim(),
      categoryId: form.categoryId || null,
      price: Number(form.price),
      isPublished: form.isPublished,
      isActive: form.isActive,
      translations,
      images: form.images.map((u) => u.trim()).filter(Boolean),
      compatibility: form.compat.map((c) => ({ modelId: c.modelId, years: parseYears(c.years) ?? [] })),
    };
    try {
      if (productId) await apiPatch(`/products/${productId}`, body);
      else await apiPost('/products', { ...body, stock: Math.max(0, Math.floor(Number(form.stock) || 0)) });
      onSaved();
    } catch (err) {
      setProblem(statusOf(err) === 409 ? t('apErrSkuTaken') : t('apErrGeneric'));
      setSaving(false);
    }
  };

  const section = 'rounded-2xl border border-border bg-card p-4 md:p-5';
  const heading = 'text-base font-extrabold text-brand-ink';
  const label = 'text-sm font-bold text-brand-ink';

  return (
    <Modal title={productId ? t('apEditorEdit') : t('apEditorNew')} onClose={onClose} size="lg">
      {loading ? (
        <div className="grid place-items-center py-16"><CarLoader label={t('loadingLabel')} /></div>
      ) : loadFailed ? (
        <p role="alert" className="px-6 py-10 text-center font-semibold text-red-800">{t('apLoadError')}</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 md:px-6">
          <section className={section}>
            <h3 className={heading}>{t('apSecBasic')}</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pe-nameAr" className={label}>{t('apNameAr')}</label>
                <input suppressHydrationWarning id="pe-nameAr" dir="rtl" maxLength={200} value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} aria-invalid={Boolean(errors.nameAr)} className={`${input} ${errors.nameAr ? 'border-red-600' : 'border-border'}`} />
              </div>
              <div>
                <label htmlFor="pe-nameEn" className={label}>{t('apNameEn')}</label>
                <input suppressHydrationWarning id="pe-nameEn" dir="ltr" maxLength={200} value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} className={`${input} border-border text-start`} />
              </div>
            </div>
            {errors.nameAr ? <p className="mt-1.5 text-sm font-semibold text-red-700">{errors.nameAr}</p> : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pe-descAr" className={label}>{t('apDescAr')}</label>
                <textarea suppressHydrationWarning id="pe-descAr" dir="rtl" rows={3} maxLength={2000} value={form.descAr} onChange={(e) => set('descAr', e.target.value)} className={textarea} />
              </div>
              <div>
                <label htmlFor="pe-descEn" className={label}>{t('apDescEn')}</label>
                <textarea suppressHydrationWarning id="pe-descEn" dir="ltr" rows={3} maxLength={2000} value={form.descEn} onChange={(e) => set('descEn', e.target.value)} className={`${textarea} text-start`} />
              </div>
            </div>
          </section>

          <section className={section}>
            <h3 className={heading}>{t('apSecClassify')}</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pe-sku" className={label}>{t('apSku')}</label>
                <input suppressHydrationWarning id="pe-sku" dir="ltr" maxLength={64} value={form.sku} onChange={(e) => set('sku', e.target.value)} aria-invalid={Boolean(errors.sku)} className={`${input} text-start ${errors.sku ? 'border-red-600' : 'border-border'}`} />
                {errors.sku ? <p className="mt-1 text-sm font-semibold text-red-700">{errors.sku}</p> : null}
              </div>
              <div>
                <label htmlFor="pe-categoryId" className={label}>{t('apCategory')}</label>
                <select suppressHydrationWarning id="pe-categoryId" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={`${input} border-border`}>
                  <option value="">{t('apNoCategory')}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{categoryName(c)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pe-partCode" className={label}>{t('apPartCode')}</label>
                <input suppressHydrationWarning id="pe-partCode" dir="ltr" maxLength={64} value={form.partCode} onChange={(e) => set('partCode', e.target.value)} className={`${input} border-border text-start`} />
              </div>
              <div>
                <label htmlFor="pe-oemReference" className={label}>{t('apOem')}</label>
                <input suppressHydrationWarning id="pe-oemReference" dir="ltr" maxLength={64} value={form.oemReference} onChange={(e) => set('oemReference', e.target.value)} className={`${input} border-border text-start`} />
              </div>
              <div>
                <label htmlFor="pe-brand" className={label}>{t('apBrand')}</label>
                <input suppressHydrationWarning id="pe-brand" maxLength={60} value={form.brand} onChange={(e) => set('brand', e.target.value)} className={`${input} border-border`} />
              </div>
              <div>
                <label htmlFor="pe-countryOfOrigin" className={label}>{t('apOrigin')}</label>
                <input suppressHydrationWarning id="pe-countryOfOrigin" maxLength={60} value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} className={`${input} border-border`} />
              </div>
            </div>
          </section>

          <section className={section}>
            <h3 className={heading}>{t('apSecPricing')}</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pe-price" className={label}>{t('apPriceLabel')}</label>
                <input suppressHydrationWarning id="pe-price" dir="ltr" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} aria-invalid={Boolean(errors.price)} className={`${input} text-start ${errors.price ? 'border-red-600' : 'border-border'}`} />
                {errors.price ? <p className="mt-1 text-sm font-semibold text-red-700">{errors.price}</p> : null}
              </div>
              {!productId ? (
                <div>
                  <label htmlFor="pe-stock" className={label}>{t('apOpeningStock')}</label>
                  <input suppressHydrationWarning id="pe-stock" dir="ltr" type="number" inputMode="numeric" min={0} max={1000000} value={form.stock} onChange={(e) => set('stock', e.target.value)} className={`${input} border-border text-start`} />
                </div>
              ) : (
                <p className="self-end text-sm text-muted">{t('apStockHint')}</p>
              )}
            </div>
          </section>

          <section className={section}>
            <h3 className={heading}>{t('apSecCompat')}</h3>
            <p className="mt-1 text-sm text-muted">{t('apCompatHint')}</p>
            <ul className="mt-3 space-y-3">
              {form.compat.map((row) => (
                <li key={row.key} className="grid gap-3 rounded-xl bg-slate-100 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div>
                    <label htmlFor={`pe-model-${row.key}`} className={label}>{t('apModel')}</label>
                    <select suppressHydrationWarning id={`pe-model-${row.key}`} value={row.modelId} onChange={(e) => set('compat', form.compat.map((c) => (c.key === row.key ? { ...c, modelId: e.target.value } : c)))} className={`${input} border-border`}>
                      <option value="">{t('apChooseModel')}</option>
                      {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`pe-years-${row.key}`} className={label}>{t('apYears')}</label>
                    <input suppressHydrationWarning id={`pe-years-${row.key}`} dir="ltr" value={row.years} placeholder={t('apYearsHint')} onChange={(e) => set('compat', form.compat.map((c) => (c.key === row.key ? { ...c, years: e.target.value } : c)))} className={`${input} border-border text-start`} />
                  </div>
                  <button type="button" onClick={() => set('compat', form.compat.filter((c) => c.key !== row.key))} aria-label={t('apRemove')} className="grid h-11 w-11 place-items-center rounded-xl text-brand-ink/60 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-brand-ink">
                    <CloseIcon width={18} height={18} />
                  </button>
                </li>
              ))}
            </ul>
            <div id="pe-compat" tabIndex={-1}>
              {errors.compat ? <p className="mt-2 text-sm font-semibold text-red-700">{errors.compat}</p> : null}
            </div>
            <button type="button" onClick={() => set('compat', [...form.compat, { key: ++rowKey, modelId: '', years: `2010-${new Date().getFullYear()}` }])} className="mt-3 inline-flex h-10 items-center rounded-lg border-2 border-dashed border-border px-4 text-sm font-bold text-brand-ink transition hover:border-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink">
              + {t('apAddModel')}
            </button>
          </section>

          <section className={section}>
            <h3 className={heading}>{t('apSecImages')}</h3>
            <p className="mt-1 text-sm text-muted">{t('apImagesHint')}</p>
            <ul className="mt-3 space-y-2">
              {form.images.map((url, i) => (
                <li key={i} className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {url.trim() ? <img src={url.trim()} alt="" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-lg bg-slate-100 object-cover" /> : <span className="h-11 w-11 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />}
                  <input suppressHydrationWarning dir="ltr" aria-label={`${t('apSecImages')} ${i + 1}`} value={url} maxLength={500} placeholder="https://… / /images/…" onChange={(e) => set('images', form.images.map((u, j) => (j === i ? e.target.value : u)))} className={`${input} mt-0 border-border text-start`} />
                  <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} aria-label={t('apRemove')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-brand-ink/60 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-brand-ink">
                    <CloseIcon width={18} height={18} />
                  </button>
                </li>
              ))}
            </ul>
            {form.images.length < 10 ? (
              <button type="button" onClick={() => set('images', [...form.images, ''])} className="mt-3 inline-flex h-10 items-center rounded-lg border-2 border-dashed border-border px-4 text-sm font-bold text-brand-ink transition hover:border-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink">
                + {t('apAddImage')}
              </button>
            ) : null}
          </section>

          <section className={section}>
            <h3 className={heading}>{t('apSecVisibility')}</h3>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2.5 font-bold text-brand-ink">
                <input suppressHydrationWarning type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} className="h-5 w-5 accent-[var(--ink)]" />
                {t('apPublished')}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2.5 font-bold text-brand-ink">
                <input suppressHydrationWarning type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-5 w-5 accent-[var(--ink)]" />
                {t('apActive')}
              </label>
            </div>
          </section>

          {problem ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{problem}</p> : null}

          <div className="sticky bottom-0 -mx-5 flex flex-wrap justify-end gap-3 border-t border-border bg-background px-5 py-4 md:-mx-6 md:px-6">
            <button type="button" onClick={onClose} className="inline-flex h-12 items-center rounded-lg border-2 border-border px-6 font-semibold text-brand-ink transition hover:border-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink">{t('apCancel')}</button>
            <button type="submit" disabled={saving} className="inline-flex h-12 min-w-32 items-center justify-center rounded-lg bg-brand-lime px-8 font-semibold text-brand-ink transition hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-60">
              {saving ? t('apSaving') : t('apSave')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
