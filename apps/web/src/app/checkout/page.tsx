'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { fetchCart, getSessionId, notifyCartChanged, type CartItem } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import CarLoader from '@/components/ui/CarLoader';
import PriceText from '@/components/PriceText';
import { ArrowIcon, CashIcon, CheckIcon, CreditCardIcon, PartsIcon, StoreIcon, TruckIcon } from '@/components/ui/Icons';

type Form = {
  guestName: string;
  guestPhone: string;
  deliveryAddress: string;
  notes: string;
  paymentMethod: 'CASH' | 'CARD';
  fulfillmentMethod: 'PICKUP' | 'DELIVERY';
};
type CartState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: CartItem[] };

const CONTACT_KEY = 'checkoutContact';
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

const input =
  'mt-1.5 w-full rounded-xl border bg-card px-4 text-base text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/40';

function readContact(): { guestName: string; guestPhone: string } | null {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [cart, setCart] = useState<CartState>({ status: 'loading' });
  const [form, setForm] = useState<Form>({
    guestName: '',
    guestPhone: '',
    deliveryAddress: '',
    notes: '',
    paymentMethod: 'CASH',
    fulfillmentMethod: 'PICKUP',
  });
  const [errors, setErrors] = useState<Partial<Record<'guestName' | 'guestPhone' | 'deliveryAddress', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(false);
  // One key per page visit: a double click or a retry can never create two orders.
  const idempotencyKey = useRef<string>('');
  const placed = useRef(false);

  // The app keeps a page alive (with its state) after you leave it. Once the order went through, leaving this page
  // empties the form's cart view and issues a fresh key, so coming back never shows a stuck button or the old cart.
  useEffect(
    () => () => {
      if (!placed.current) return;
      placed.current = false;
      idempotencyKey.current = crypto.randomUUID();
      setCart({ status: 'ready', items: [] });
      setSubmitting(false);
    },
    [],
  );

  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
    let alive = true;
    fetchCart()
      .then((c) => alive && setCart({ status: 'ready', items: c?.items ?? [] }))
      .catch(() => alive && setCart({ status: 'error' }));
    const saved = readContact();
    if (saved?.guestName || saved?.guestPhone) {
      Promise.resolve().then(() => {
        if (!alive) return;
        setForm((f) => ({ ...f, guestName: saved.guestName ?? '', guestPhone: saved.guestPhone ?? '' }));
        setRemembered(true);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  const items = cart.status === 'ready' ? cart.items : [];
  const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const units = items.reduce((s, i) => s + i.quantity, 0);
  const itemName = (i: CartItem) =>
    i.product.translations?.find((x) => x.locale === locale)?.name || i.product.translations?.[0]?.name || i.product.sku;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k2]) => k2 !== key)) : e));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (form.guestName.trim().length < 2) next.guestName = t('prRequired');
    if (!PHONE_RE.test(form.guestPhone.trim())) next.guestPhone = t('prPhoneInvalid');
    if (form.fulfillmentMethod === 'DELIVERY' && form.deliveryAddress.trim().length < 5) next.deliveryAddress = t('coErrAddress');
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`co-${first}`)?.focus();
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const order = await apiPost('/orders/checkout', {
        paymentMethod: form.paymentMethod,
        fulfillmentMethod: form.fulfillmentMethod,
        guestName: form.guestName.trim(),
        guestPhone: form.guestPhone.trim(),
        ...(form.fulfillmentMethod === 'DELIVERY' ? { deliveryAddress: form.deliveryAddress.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        sessionId: getSessionId() ?? undefined,
        idempotencyKey: idempotencyKey.current,
      });
      try {
        localStorage.setItem(CONTACT_KEY, JSON.stringify({ guestName: form.guestName.trim(), guestPhone: form.guestPhone.trim() }));
        // The confirmation page shows this summary: the order endpoint itself is staff-only.
        sessionStorage.setItem(
          'lastOrder',
          JSON.stringify({
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            fulfillmentMethod: order.fulfillmentMethod,
          }),
        );
      } catch {
        // Storage can be blocked; the confirmation page copes without it.
      }
      notifyCartChanged();
      placed.current = true; // the button stays disabled until the page is left, so a double click cannot order twice
      router.push(`/orders/success/${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setServerError(/insufficient stock/i.test(message) ? t('coErrStock') : t('coErrGeneric'));
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section aria-labelledby="co-title" className="bg-brand-ink text-brand-bone">
        <div className="container-xl py-8 md:py-10">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold" aria-label={`${t('coStepCart')} → ${t('coStepDetails')} → ${t('coStepDone')}`}>
            <li className="inline-flex items-center gap-2 text-brand-bone/70">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-bone/15"><CheckIcon width={14} height={14} strokeWidth={3} /></span>
              <Link href="/cart" className="underline-offset-4 hover:underline">{t('coStepCart')}</Link>
            </li>
            <li aria-hidden="true" className="h-px w-6 bg-brand-bone/30" />
            <li className="inline-flex items-center gap-2 text-brand-lime" aria-current="step">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-lime text-xs font-extrabold text-brand-ink">2</span>
              {t('coStepDetails')}
            </li>
            <li aria-hidden="true" className="h-px w-6 bg-brand-bone/30" />
            <li className="inline-flex items-center gap-2 text-brand-bone/60">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-brand-bone/35 text-xs font-extrabold">3</span>
              {t('coStepDone')}
            </li>
          </ol>
          <h1 id="co-title" className="font-display mt-4 text-3xl font-extrabold md:text-4xl">{t('checkout')}</h1>
          <p className="mt-1.5 text-brand-bone/75">{t('coSub')}</p>
        </div>
      </section>

      <div className="container-xl py-8 md:py-10">
        {cart.status === 'loading' ? (
          <div className="grid min-h-[40vh] place-items-center"><CarLoader size="lg" label={t('loadingLabel')} /></div>
        ) : null}

        {cart.status === 'error' ? (
          <div role="alert" className="mx-auto max-w-xl rounded-2xl bg-red-50 p-6 text-center font-semibold text-red-800">{t('cartErrorTitle')}</div>
        ) : null}

        {cart.status === 'ready' && items.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl bg-brand-ink px-6 py-14 text-center text-brand-bone">
            <CarLoader tone="bone" still />
            <h2 className="mt-6 text-xl font-extrabold md:text-2xl">{t('cartEmptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-brand-bone/75">{t('cartEmptyDesc')}</p>
            <ButtonLink href="/vehicles" size="lg" className="mt-7">
              {t('cartEmptyCta')}
              <ArrowIcon width={16} height={16} />
            </ButtonLink>
          </div>
        ) : null}

        {cart.status === 'ready' && items.length > 0 ? (
          <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
            <div className="space-y-5">
              {/* 1. contact */}
              <fieldset className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                <legend className="sr-only">{t('coContact')}</legend>
                <h2 className="flex items-center gap-3 text-lg font-extrabold text-brand-ink">
                  <StepBadge n={1} />
                  {t('coContact')}
                </h2>
                {remembered ? <p className="mt-2 text-sm text-muted">{t('coRemembered')}</p> : null}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="co-guestName" className="text-sm font-bold text-brand-ink">{t('fullName')}</label>
                    <input suppressHydrationWarning id="co-guestName" autoComplete="name" maxLength={80} value={form.guestName} onChange={(e) => set('guestName', e.target.value)} aria-invalid={Boolean(errors.guestName)} aria-describedby={errors.guestName ? 'co-guestName-err' : undefined} className={`${input} h-12 ${errors.guestName ? 'border-red-600' : 'border-border'}`} />
                    {errors.guestName ? <p id="co-guestName-err" className="mt-1 text-sm font-semibold text-red-700">{errors.guestName}</p> : null}
                  </div>
                  <div>
                    <label htmlFor="co-guestPhone" className="text-sm font-bold text-brand-ink">{t('mobile')}</label>
                    <input suppressHydrationWarning id="co-guestPhone" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" maxLength={20} value={form.guestPhone} onChange={(e) => set('guestPhone', e.target.value)} aria-invalid={Boolean(errors.guestPhone)} aria-describedby={errors.guestPhone ? 'co-guestPhone-err' : undefined} className={`${input} h-12 text-start ${errors.guestPhone ? 'border-red-600' : 'border-border'}`} />
                    {errors.guestPhone ? <p id="co-guestPhone-err" className="mt-1 text-sm font-semibold text-red-700">{errors.guestPhone}</p> : null}
                  </div>
                </div>
              </fieldset>

              {/* 2. receiving */}
              <fieldset className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                <legend className="sr-only">{t('coReceive')}</legend>
                <h2 className="flex items-center gap-3 text-lg font-extrabold text-brand-ink">
                  <StepBadge n={2} />
                  {t('coReceive')}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Choice name="fulfillment" checked={form.fulfillmentMethod === 'PICKUP'} onChange={() => set('fulfillmentMethod', 'PICKUP')} icon={<StoreIcon width={22} height={22} />} title={t('branchPickup')} desc={t('coPickupDesc')} />
                  <Choice name="fulfillment" checked={form.fulfillmentMethod === 'DELIVERY'} onChange={() => set('fulfillmentMethod', 'DELIVERY')} icon={<TruckIcon width={22} height={22} />} title={t('homeDelivery')} desc={t('coDeliveryDesc')} />
                </div>
                {form.fulfillmentMethod === 'DELIVERY' ? (
                  <div className="mt-4">
                    <label htmlFor="co-deliveryAddress" className="text-sm font-bold text-brand-ink">{t('coAddress')}</label>
                    <textarea suppressHydrationWarning id="co-deliveryAddress" rows={3} maxLength={300} value={form.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} placeholder={t('coAddressPlaceholder')} aria-invalid={Boolean(errors.deliveryAddress)} aria-describedby={errors.deliveryAddress ? 'co-deliveryAddress-err' : undefined} className={`${input} py-3 ${errors.deliveryAddress ? 'border-red-600' : 'border-border'}`} />
                    {errors.deliveryAddress ? <p id="co-deliveryAddress-err" className="mt-1 text-sm font-semibold text-red-700">{errors.deliveryAddress}</p> : null}
                  </div>
                ) : null}
              </fieldset>

              {/* 3. payment */}
              <fieldset className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                <legend className="sr-only">{t('coPayment')}</legend>
                <h2 className="flex items-center gap-3 text-lg font-extrabold text-brand-ink">
                  <StepBadge n={3} />
                  {t('coPayment')}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Choice name="payment" checked={form.paymentMethod === 'CASH'} onChange={() => set('paymentMethod', 'CASH')} icon={<CashIcon width={22} height={22} />} title={t('cash')} />
                  <Choice name="payment" checked={form.paymentMethod === 'CARD'} onChange={() => set('paymentMethod', 'CARD')} icon={<CreditCardIcon width={22} height={22} />} title={t('card')} />
                </div>
                <div className="mt-5">
                  <label htmlFor="co-notes" className="text-sm font-bold text-brand-ink">{t('coNotes')}</label>
                  <textarea suppressHydrationWarning id="co-notes" rows={2} maxLength={500} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={`${input} border-border py-3`} />
                </div>
              </fieldset>
            </div>

            {/* summary */}
            <aside aria-labelledby="co-summary" className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6 lg:sticky lg:top-24">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="co-summary" className="text-lg font-extrabold text-brand-ink">{t('cartSummary')}</h2>
                <Link href="/cart" className="text-sm font-semibold text-brand-ink underline underline-offset-4">{t('coBackToCart')}</Link>
              </div>
              <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pe-1">
                {items.map((i) => {
                  const photo = i.product.images?.[0]?.url;
                  return (
                    <li key={i.id} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-slate-400" aria-hidden="true"><PartsIcon width={20} height={20} strokeWidth={1.4} /></div>
                        )}
                        <span className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-ink px-1 text-[0.7rem] font-extrabold text-brand-bone">{i.quantity}</span>
                      </div>
                      <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug text-brand-ink">{itemName(i)}</p>
                      <p className="shrink-0 text-sm font-bold text-brand-ink" dir="ltr">{formatPrice(Number(i.product.price) * i.quantity, locale)}</p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted">
                <span>{t('cartItemsTotal')} ({units === 1 ? t('cartCountOne') : t('cartCount').replace('{n}', String(units))})</span>
                <span className="font-semibold text-brand-ink" dir="ltr">{formatPrice(total, locale)}</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="font-bold text-brand-ink">{t('total')}</span>
                <span className="text-3xl text-brand-ink" dir="ltr"><PriceText value={formatPrice(total, locale)} /></span>
              </div>

              {serverError ? (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
                  {serverError}{' '}
                  <Link href="/cart" className="underline underline-offset-4">{t('coBackToCart')}</Link>
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-lime px-6 py-3.5 text-base font-semibold text-brand-ink transition hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <CarLoader size="xs" className="[&>svg]:w-9" />
                    {t('coPlacing')}
                  </>
                ) : (
                  <>
                    {t('coPlace')}
                    <ArrowIcon width={16} height={16} />
                  </>
                )}
              </button>
            </aside>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-ink text-sm font-extrabold text-brand-bone">{n}</span>;
}

/** A selectable card backed by a real radio input, so keyboard and screen readers work natively. */
function Choice({
  name,
  checked,
  onChange,
  icon,
  title,
  desc,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  desc?: string;
}) {
  return (
    <label
      className={`relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-ink ${
        checked ? 'border-brand-ink bg-brand-ink/[0.04]' : 'border-border hover:border-brand-ink/40'
      }`}
    >
      <input suppressHydrationWarning type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${checked ? 'bg-brand-ink text-brand-lime' : 'bg-slate-100 text-brand-ink'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-brand-ink">{title}</span>
        {desc ? <span className="mt-0.5 block text-sm text-muted">{desc}</span> : null}
      </span>
      <span aria-hidden="true" className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-brand-ink bg-brand-ink text-brand-lime' : 'border-border'}`}>
        {checked ? <CheckIcon width={12} height={12} strokeWidth={3.5} /> : null}
      </span>
    </label>
  );
}
