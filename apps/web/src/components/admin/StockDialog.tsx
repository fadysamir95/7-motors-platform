'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import Modal from '@/components/ui/Modal';

const field = 'mt-1.5 h-12 w-full rounded-xl border border-border bg-card px-4 text-base text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40';

/** Adds or removes units of one part. The server refuses to go below zero or below the units reserved for orders. */
export default function StockDialog({
  product,
  onDone,
  onClose,
}: {
  product: { id: string; name: string; stock: number; reserved: number };
  onDone: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = Math.floor(Number(quantity));
  const valid = Number.isFinite(qty) && qty >= 1 && qty <= 1_000_000;
  const next = product.stock + (type === 'IN' ? qty : -qty);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/inventory/${product.id}/adjust`, { type, quantity: qty, ...(note.trim() ? { note: note.trim() } : {}) });
      onDone();
    } catch {
      setError(t('apStockError'));
      setSaving(false);
    }
  };

  return (
    <Modal title={t('apStockTitle')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        <p className="font-bold text-brand-ink">{product.name}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-100 p-3">
            <dt className="text-muted">{t('apStockCurrent')}</dt>
            <dd className="mt-0.5 text-2xl font-extrabold text-brand-ink" dir="ltr" style={{ textAlign: 'start' }}>{product.stock}</dd>
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <dt className="text-muted">{t('apReserved').replace('{n}', '')}</dt>
            <dd className="mt-0.5 text-2xl font-extrabold text-brand-ink" dir="ltr" style={{ textAlign: 'start' }}>{product.reserved}</dd>
          </div>
        </dl>

        <fieldset>
          <legend className="sr-only">{t('apStockTitle')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['IN', 'OUT'] as const).map((v) => (
              <label key={v} className={`flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-2.5 text-center font-bold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-ink ${type === v ? 'border-brand-ink bg-brand-ink text-brand-bone' : 'border-border text-brand-ink hover:border-brand-ink/40'}`}>
                <input type="radio" name="stock-type" className="sr-only" checked={type === v} onChange={() => setType(v)} />
                {v === 'IN' ? t('apStockAdd') : t('apStockRemove')}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="stock-qty" className="text-sm font-bold text-brand-ink">{t('apStockAmount')}</label>
          <input id="stock-qty" type="number" inputMode="numeric" min={1} max={1000000} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} autoFocus />
          {valid ? <p className="mt-1.5 text-sm text-muted">{t('apStockCurrent')} → <span className="font-bold text-brand-ink" dir="ltr">{next}</span></p> : null}
        </div>
        <div>
          <label htmlFor="stock-note" className="text-sm font-bold text-brand-ink">{t('apStockNote')}</label>
          <input id="stock-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </div>

        {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p> : null}

        <button type="submit" disabled={!valid || saving} className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand-lime font-semibold text-brand-ink transition hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-60">
          {saving ? t('apSaving') : t('apStockApply')}
        </button>
      </form>
    </Modal>
  );
}
