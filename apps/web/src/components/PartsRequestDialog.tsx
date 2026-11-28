'use client';
import { useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import { CheckIcon, CloseIcon } from '@/components/ui/Icons';

type Model = { id: string; name: string };

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

const field =
  'mt-1.5 h-12 w-full rounded-xl border border-border bg-card px-4 text-base text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40';

/**
 * "Can't find my part" form. It posts to POST /wholesale/parts-requests, which stores the request for the
 * team (it appears in the admin wholesale request list, tagged PARTS_REQUEST).
 * Mount it only while it should be open: it opens as a modal on mount and calls `onClose` when dismissed.
 */
export default function PartsRequestDialog({
  models,
  defaultModelId,
  onClose,
}: {
  models: Model[];
  defaultModelId?: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({
    partName: '',
    modelId: defaultModelId ?? '',
    quantity: '1',
    fullName: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((er) => (key in er ? Object.fromEntries(Object.entries(er).filter(([k2]) => k2 !== key)) : er));
    };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.partName.trim().length < 2) next.partName = t('prRequired');
    if (form.fullName.trim().length < 2) next.fullName = t('prRequired');
    if (!PHONE_RE.test(form.phone.trim())) next.phone = t('prPhoneInvalid');
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    setFailed(false);
    try {
      const qty = Math.min(99, Math.max(1, Math.round(Number(form.quantity) || 1)));
      const res = await apiPost('/wholesale/parts-requests', {
        partName: form.partName.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        quantity: qty,
        ...(form.modelId ? { modelId: form.modelId } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
      setReference(String(res.id).slice(0, 8).toUpperCase());
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dim backdrop (the dialog element itself) dismisses it.
        if (e.target === dialogRef.current) close();
      }}
      aria-labelledby="pr-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-background p-0 text-foreground shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop:bg-brand-ink/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 id="pr-title" className="text-xl font-extrabold text-brand-ink">{reference ? t('prSuccessTitle') : t('prTitle')}</h2>
          {reference ? null : <p className="mt-1 text-sm text-muted">{t('prSubtitle')}</p>}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t('prClose')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-ink/70 transition hover:bg-brand-ink/10 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink"
        >
          <CloseIcon width={18} height={18} />
        </button>
      </div>

      {reference ? (
        <div className="px-6 py-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-lime text-brand-ink">
            <CheckIcon width={26} height={26} strokeWidth={2.5} />
          </div>
          <p className="mt-4 text-brand-ink">{t('prSuccessDesc')}</p>
          <p className="mt-3 text-sm text-muted">
            {t('prRef')}: <span className="font-mono font-bold text-brand-ink" dir="ltr">{reference}</span>
          </p>
          <button
            type="button"
            onClick={close}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-brand-ink px-8 font-semibold text-brand-bone transition hover:bg-brand-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
          >
            {t('prClose')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="pr-part" className="text-sm font-bold text-brand-ink">{t('prPart')}</label>
            <input id="pr-part" className={field} value={form.partName} onChange={set('partName')} placeholder={t('prPartPlaceholder')} maxLength={120} aria-invalid={Boolean(errors.partName)} aria-describedby={errors.partName ? 'pr-part-err' : undefined} autoFocus />
            {errors.partName ? <p id="pr-part-err" className="mt-1 text-sm font-semibold text-red-700">{errors.partName}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <div>
              <label htmlFor="pr-model" className="text-sm font-bold text-brand-ink">{t('prVehicle')}</label>
              <select id="pr-model" className={field} value={form.modelId} onChange={set('modelId')}>
                <option value="">{t('prVehicleNone')}</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pr-qty" className="text-sm font-bold text-brand-ink">{t('prQty')}</label>
              <input id="pr-qty" type="number" inputMode="numeric" min={1} max={99} className={field} value={form.quantity} onChange={set('quantity')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-name" className="text-sm font-bold text-brand-ink">{t('prName')}</label>
              <input id="pr-name" className={field} value={form.fullName} onChange={set('fullName')} maxLength={80} autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'pr-name-err' : undefined} />
              {errors.fullName ? <p id="pr-name-err" className="mt-1 text-sm font-semibold text-red-700">{errors.fullName}</p> : null}
            </div>
            <div>
              <label htmlFor="pr-phone" className="text-sm font-bold text-brand-ink">{t('prPhone')}</label>
              <input id="pr-phone" type="tel" dir="ltr" className={`${field} text-start`} value={form.phone} onChange={set('phone')} maxLength={20} autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'pr-phone-err' : undefined} />
              {errors.phone ? <p id="pr-phone-err" className="mt-1 text-sm font-semibold text-red-700">{errors.phone}</p> : null}
            </div>
          </div>

          <div>
            <label htmlFor="pr-email" className="text-sm font-bold text-brand-ink">{t('prEmail')}</label>
            <input id="pr-email" type="email" dir="ltr" className={`${field} text-start`} value={form.email} onChange={set('email')} maxLength={120} autoComplete="email" />
          </div>

          <div>
            <label htmlFor="pr-notes" className="text-sm font-bold text-brand-ink">{t('prNotes')}</label>
            <textarea id="pr-notes" rows={3} maxLength={500} className={`${field} h-auto py-3`} value={form.notes} onChange={set('notes')} placeholder={t('prNotesPlaceholder')} />
          </div>

          {failed ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{t('prError')}</p> : null}

          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand-lime font-semibold text-brand-ink transition hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-60"
          >
            {sending ? t('prSending') : t('prSubmit')}
          </button>
        </form>
      )}
    </dialog>
  );
}
