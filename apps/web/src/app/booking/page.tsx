'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import CarLoader from '@/components/ui/CarLoader';
import { ArrowIcon, CalendarIcon, CheckIcon } from '@/components/ui/Icons';

type ServiceType = { id: string; slug: string; translations?: { locale: string; name: string }[] };
type Model = { id: string; name: string };
type Slot = { startTime: string; available: boolean };

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const INSTALL_SLUG = 'parts-installation';

const input =
  'mt-1.5 h-12 w-full rounded-xl border bg-card px-4 text-base text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function readLastOrder(orderId: string | null): { orderNumber?: string } | null {
  if (!orderId) return null;
  try {
    const raw = sessionStorage.getItem('lastOrder');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.id === orderId ? parsed : null;
  } catch {
    return null;
  }
}

function BookingContent() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const orderId = useSearchParams().get('orderId');

  const [models, setModels] = useState<Model[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [slots, setSlots] = useState<{ date: string; items: Slot[] } | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    licenseNumber: '',
    modelId: '',
    vin: '',
    vehicleYear: '',
    serviceTypeIds: [] as string[],
    date: '',
    startTime: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [linkedOrder, setLinkedOrder] = useState<string | null>(null);
  // Today's date comes from the visitor's clock, so it is set after mount (the server and the browser can disagree).
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  const redirected = useRef(false);

  // The app keeps a page alive (with its state) after you leave it. Once a booking went through, leaving this page
  // clears the form, so coming back never shows a finished booking or a button stuck on "sending".
  useEffect(
    () => () => {
      if (!redirected.current) return;
      redirected.current = false;
      setForm((f) => ({ ...f, licenseNumber: '', modelId: '', vin: '', vehicleYear: '', serviceTypeIds: [], date: '', startTime: '', notes: '' }));
      setSlots(null);
      setErrors({});
      setServerError(null);
      setSubmitting(false);
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    apiGet('/vehicles?active=true').then((d) => alive && setModels(Array.isArray(d) ? d : d.items || [])).catch(() => undefined);
    apiGet('/bookings/service-types')
      .then((d) => {
        if (!alive) return;
        const list: ServiceType[] = Array.isArray(d) ? d : d.items || [];
        setServiceTypes(list);
        // Coming from an order: installation is what the customer is here for.
        const install = orderId ? list.find((s) => s.slug === INSTALL_SLUG) : undefined;
        if (install) setForm((f) => (f.serviceTypeIds.length ? f : { ...f, serviceTypeIds: [install.id] }));
      })
      .catch(() => undefined);
    // Reuse the contact details from checkout, and show which order this booking belongs to.
    Promise.resolve().then(() => {
      if (!alive) return;
      setMinDate(todayISO());
      try {
        const saved = JSON.parse(localStorage.getItem('checkoutContact') || 'null');
        if (saved) setForm((f) => ({ ...f, fullName: f.fullName || saved.guestName || '', phone: f.phone || saved.guestPhone || '' }));
      } catch {
        // Storage can be blocked or hold something unexpected; the form simply starts empty.
      }
      setLinkedOrder(readLastOrder(orderId)?.orderNumber ?? null);
    });
    return () => {
      alive = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!form.date) return;
    let alive = true;
    apiGet(`/bookings/slots?date=${form.date}`)
      .then((d) => alive && setSlots({ date: form.date, items: Array.isArray(d) ? d : [] }))
      .catch(() => alive && setSlots({ date: form.date, items: [] }));
    return () => {
      alive = false;
    };
  }, [form.date]);

  const slotsLoading = Boolean(form.date) && slots?.date !== form.date;
  const slotItems = slots?.date === form.date ? slots.items : [];

  const serviceName = (s: ServiceType) => s.translations?.find((x) => x.locale === locale)?.name || s.translations?.[0]?.name || s.slug;
  const chosenServices = useMemo(() => serviceTypes.filter((s) => form.serviceTypeIds.includes(s.id)), [serviceTypes, form.serviceTypeIds]);
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1994 }, (_, i) => current - i);
  }, []);

  const clearError = (key: string) => setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearError(key);
  };
  const toggleService = (id: string) => {
    clearError('services');
    setForm((f) => ({ ...f, serviceTypeIds: f.serviceTypeIds.includes(id) ? f.serviceTypeIds.filter((x) => x !== id) : [...f.serviceTypeIds, id] }));
  };

  const dateLabel = form.date
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${form.date}T12:00:00`))
    : '';

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next.fullName = t('prRequired');
    if (!PHONE_RE.test(form.phone.trim())) next.phone = t('prPhoneInvalid');
    if (form.licenseNumber.trim().length < 2) next.licenseNumber = t('bkErrPlate');
    if (!form.serviceTypeIds.length) next.services = t('bkErrServices');
    if (!form.date) next.date = t('bkErrDate');
    else if (!form.startTime) next.startTime = t('bkErrSlot');
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`bk-${first}`)?.focus();
    return !first;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const booking = await apiPost('/bookings', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        licenseNumber: form.licenseNumber.trim(),
        serviceTypeIds: form.serviceTypeIds,
        date: form.date,
        startTime: form.startTime,
        ...(form.modelId ? { modelId: form.modelId } : {}),
        ...(form.vin.trim() ? { vin: form.vin.trim() } : {}),
        ...(form.vehicleYear ? { vehicleYear: Number(form.vehicleYear) } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        ...(orderId ? { orderId } : {}),
      });
      try {
        localStorage.setItem('checkoutContact', JSON.stringify({ guestName: form.fullName.trim(), guestPhone: form.phone.trim() }));
      } catch {
        // Remembering the contact details is only a convenience.
      }
      try {
        // The confirmation page (its own address) shows this summary.
        sessionStorage.setItem(
          'lastBooking',
          JSON.stringify({
            ref: booking.bookingRef,
            date: form.date,
            startTime: form.startTime,
            services: chosenServices.map(serviceName),
            plate: form.licenseNumber.trim(),
            orderNumber: linkedOrder ?? undefined,
          }),
        );
      } catch {
        // Storage can be blocked; the confirmation page copes without it.
      }
      redirected.current = true; // the button stays disabled until the page is left, so a double click cannot book twice
      router.push(`/booking/success/${encodeURIComponent(booking.bookingRef)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/already booked|blocked/i.test(message)) {
        setServerError(t('bkTaken'));
        set('startTime', '');
        setSlots(null); // refetch so the taken slot shows as unavailable
        const d = form.date;
        apiGet(`/bookings/slots?date=${d}`).then((r) => setSlots({ date: d, items: Array.isArray(r) ? r : [] })).catch(() => undefined);
      } else {
        setServerError(t('bkError'));
      }
    } finally {
      if (!redirected.current) setSubmitting(false);
    }
  };

  const header = (
    <section aria-labelledby="bk-title" className="bg-brand-ink text-brand-bone">
      <div className="container-xl py-8 md:py-10">
        <h1 id="bk-title" className="font-display text-3xl font-extrabold md:text-4xl">{t('booking')}</h1>
        <p className="mt-1.5 text-brand-bone/75">{t('bkSub')}</p>
      </div>
    </section>
  );

  return (
    <div>
      {header}
      <div className="container-xl py-8 md:py-10">
        {orderId ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-brand-lime/25 p-4 text-brand-ink">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-ink text-brand-lime"><CheckIcon width={18} height={18} strokeWidth={3} /></span>
            <div>
              <p className="font-extrabold">
                {t('bkLinkedOrder')}
                {linkedOrder ? <> <span className="font-mono" dir="ltr">{linkedOrder}</span></> : null}
              </p>
              <p className="mt-0.5 text-sm text-brand-ink/80">{t('bkLinkedHint')}</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <div className="space-y-5">
            <Card n={1} title={t('bkContact')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="bk-fullName" label={t('fullName')} error={errors.fullName}>
                  <input suppressHydrationWarning id="bk-fullName" autoComplete="name" maxLength={80} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} aria-invalid={Boolean(errors.fullName)} className={`${input} ${errors.fullName ? 'border-red-600' : 'border-border'}`} />
                </Field>
                <Field id="bk-phone" label={t('mobile')} error={errors.phone}>
                  <input suppressHydrationWarning id="bk-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={Boolean(errors.phone)} className={`${input} text-start ${errors.phone ? 'border-red-600' : 'border-border'}`} />
                </Field>
              </div>
            </Card>

            <Card n={2} title={t('bkVehicle')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="bk-licenseNumber" label={t('licenseNumber')} error={errors.licenseNumber}>
                  <input suppressHydrationWarning id="bk-licenseNumber" maxLength={20} value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} aria-invalid={Boolean(errors.licenseNumber)} className={`${input} ${errors.licenseNumber ? 'border-red-600' : 'border-border'}`} />
                </Field>
                <Field id="bk-model" label={`${t('model')} (${t('bkOptional')})`}>
                  <select suppressHydrationWarning id="bk-model" value={form.modelId} onChange={(e) => set('modelId', e.target.value)} className={`${input} border-border`}>
                    <option value="">{t('bkVehicleModelPlaceholder')}</option>
                    {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
                <Field id="bk-year" label={`${t('year')} (${t('bkOptional')})`}>
                  <select suppressHydrationWarning id="bk-year" value={form.vehicleYear} onChange={(e) => set('vehicleYear', e.target.value)} className={`${input} border-border`}>
                    <option value="">—</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <Field id="bk-vin" label={`${t('vin')} (${t('bkOptional')})`}>
                  <input suppressHydrationWarning id="bk-vin" dir="ltr" maxLength={24} value={form.vin} onChange={(e) => set('vin', e.target.value.toUpperCase())} className={`${input} border-border text-start`} />
                </Field>
              </div>
            </Card>

            <Card n={3} title={t('bkServices')}>
              <div id="bk-services" tabIndex={-1} className="grid gap-3 sm:grid-cols-2">
                {serviceTypes.map((s) => {
                  const on = form.serviceTypeIds.includes(s.id);
                  return (
                    <label key={s.id} className={`relative flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-ink ${on ? 'border-brand-ink bg-brand-ink/[0.04]' : 'border-border hover:border-brand-ink/40'}`}>
                      <input suppressHydrationWarning type="checkbox" className="sr-only" checked={on} onChange={() => toggleService(s.id)} />
                      <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-brand-ink bg-brand-ink text-brand-lime' : 'border-border'}`}>
                        {on ? <CheckIcon width={14} height={14} strokeWidth={3.5} /> : null}
                      </span>
                      <span className="font-semibold text-brand-ink">{serviceName(s)}</span>
                    </label>
                  );
                })}
              </div>
              {errors.services ? <p className="mt-2 text-sm font-semibold text-red-700">{errors.services}</p> : null}
            </Card>

            <Card n={4} title={t('bkWhen')}>
              <Field id="bk-date" label={t('bkDate')} error={errors.date}>
                <input suppressHydrationWarning id="bk-date" type="date" min={minDate} value={form.date} onChange={(e) => { set('date', e.target.value); set('startTime', ''); }} aria-invalid={Boolean(errors.date)} className={`${input} sm:max-w-xs ${errors.date ? 'border-red-600' : 'border-border'}`} />
              </Field>
              <div className="mt-4" aria-live="polite">
                <p className="text-sm font-bold text-brand-ink">{t('bkSlotsFor')}{dateLabel ? ` · ${dateLabel}` : ''}</p>
                {!form.date ? <p className="mt-2 text-sm text-muted">{t('bkPickDate')}</p> : null}
                {slotsLoading ? <div className="mt-3"><CarLoader size="xs" tone="ink" /></div> : null}
                {form.date && !slotsLoading && !slotItems.some((s) => s.available) ? <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-brand-ink">{t('bkClosed')}</p> : null}
                {form.date && !slotsLoading && slotItems.some((s) => s.available) ? (
                  <div id="bk-startTime" tabIndex={-1} role="radiogroup" aria-label={t('selectSlot')} className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {slotItems.map((s) => {
                      const on = form.startTime === s.startTime;
                      return (
                        <button
                          key={s.startTime}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          disabled={!s.available}
                          onClick={() => set('startTime', s.startTime)}
                          className={`h-11 rounded-xl border-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-100 disabled:text-brand-ink/30 disabled:line-through ${on ? 'border-brand-ink bg-brand-ink text-brand-bone' : 'border-border bg-card text-brand-ink hover:border-brand-ink/50'}`}
                          dir="ltr"
                        >
                          {s.startTime}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {errors.startTime ? <p className="mt-2 text-sm font-semibold text-red-700">{errors.startTime}</p> : null}
              </div>
              <div className="mt-5">
                <label htmlFor="bk-notes" className="text-sm font-bold text-brand-ink">{t('notes')} ({t('bkOptional')})</label>
                <textarea suppressHydrationWarning id="bk-notes" rows={2} maxLength={500} value={form.notes} onChange={(e) => set('notes', e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40" />
              </div>
            </Card>
          </div>

          <aside aria-labelledby="bk-summary" className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6 lg:sticky lg:top-24">
            <h2 id="bk-summary" className="text-lg font-extrabold text-brand-ink">{t('bkSummary')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted">{t('bkServices')}</dt>
                <dd className="mt-0.5 font-semibold text-brand-ink">{chosenServices.length ? chosenServices.map(serviceName).join('، ') : <span className="text-muted">{t('bkNothing')}</span>}</dd>
              </div>
              <div>
                <dt className="text-muted">{t('bkWhenLabel')}</dt>
                <dd className="mt-0.5 flex items-center gap-2 font-semibold text-brand-ink">
                  <CalendarIcon width={16} height={16} />
                  {form.date && form.startTime ? <>{dateLabel} · <span dir="ltr">{form.startTime}</span></> : <span className="text-muted">{t('bkNothing')}</span>}
                </dd>
              </div>
            </dl>
            {serverError ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">{serverError}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-lime px-6 py-3.5 text-base font-semibold text-brand-ink transition hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <CarLoader size="xs" className="[&>svg]:w-9" />
                  {t('bkSending')}
                </>
              ) : (
                <>
                  {t('submitBooking')}
                  <ArrowIcon width={16} height={16} />
                </>
              )}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Card({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
      <h2 className="flex items-center gap-3 text-lg font-extrabold text-brand-ink">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-ink text-sm font-extrabold text-brand-bone">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-brand-ink">{label}</label>
      {children}
      {error ? <p className="mt-1 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={null}>
      <BookingContent />
    </Suspense>
  );
}
