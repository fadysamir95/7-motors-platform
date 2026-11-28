'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import { getSessionId, notifyCartChanged } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { useLocale } from '@/components/LocaleProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import CarLoader from '@/components/ui/CarLoader';
import { ArrowIcon, CartIcon, CloseIcon, PartsIcon } from '@/components/ui/Icons';

type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    sku: string;
    partCode?: string | null;
    price: string | number;
    translations?: { locale: string; name: string }[];
    images?: { url: string }[];
    inventory?: { stock: number; reserved?: number } | null;
  };
};
type CartData = { items: CartItem[] };
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; cart: CartData };

const MAX_QTY = 99;

/** Units a shopper can still order: on-hand stock minus what is reserved for other orders. */
const available = (i: CartItem) => {
  const inv = i.product.inventory;
  return inv ? Math.max(0, inv.stock - (inv.reserved ?? 0)) : MAX_QTY;
};

function fetchCart(): Promise<CartData> {
  const sessionId = getSessionId();
  // Nothing has been added in this browser yet, so there is no cart to ask the API about.
  if (!sessionId) return Promise.resolve({ items: [] });
  return apiGet(`/cart?sessionId=${sessionId}`);
}

export default function CartPage() {
  const { t, locale } = useLocale();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    fetchCart()
      .then((cart) => alive && setState({ status: 'ready', cart: { items: cart?.items ?? [] } }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const reload = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  const items = state.status === 'ready' ? state.cart.items : [];
  const units = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const hasProblem = items.some((i) => available(i) < i.quantity);

  const name = (i: CartItem) =>
    i.product.translations?.find((x) => x.locale === locale)?.name || i.product.translations?.[0]?.name || i.product.sku;

  const patchItems = (fn: (list: CartItem[]) => CartItem[]) =>
    setState((s) => (s.status === 'ready' ? { status: 'ready', cart: { items: fn(s.cart.items) } } : s));

  const withBusy = async (id: string, work: () => Promise<unknown>) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await work();
      notifyCartChanged();
    } catch {
      reload(); // the server is the source of truth: fall back to what it holds
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const setQuantity = (item: CartItem, quantity: number) => {
    const next = Math.min(MAX_QTY, Math.max(1, quantity));
    if (next === item.quantity || busy[item.id]) return;
    patchItems((list) => list.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)));
    void withBusy(item.id, () => apiPatch(`/cart/items/${item.id}?sessionId=${getSessionId()}`, { quantity: next }));
  };

  const remove = (item: CartItem) => {
    patchItems((list) => list.filter((i) => i.id !== item.id));
    void withBusy(item.id, () => apiDelete(`/cart/items/${item.id}?sessionId=${getSessionId()}`));
  };

  const clear = () => {
    patchItems(() => []);
    void withBusy('all', () => apiDelete(`/cart?sessionId=${getSessionId()}`));
  };

  const countLabel = units === 1 ? t('cartCountOne') : t('cartCount').replace('{n}', String(units));

  return (
    <div>
      <section aria-labelledby="cart-title" className="bg-brand-ink text-brand-bone">
        <div className="container-xl flex flex-wrap items-end justify-between gap-3 py-8 md:py-10">
          <div>
            <h1 id="cart-title" className="font-display text-3xl font-extrabold md:text-4xl">{t('cart')}</h1>
            <p className="mt-1.5 text-brand-bone/75">{t('cartSub')}</p>
          </div>
          {state.status === 'ready' && units > 0 ? (
            <p className="rounded-full border border-brand-bone/25 px-4 py-1.5 text-sm font-bold" aria-live="polite">{countLabel}</p>
          ) : null}
        </div>
      </section>

      <div className="container-xl py-8 md:py-10">
        {state.status === 'loading' ? (
          <div className="grid min-h-[40vh] place-items-center">
            <CarLoader size="lg" label={t('loadingLabel')} />
          </div>
        ) : null}

        {state.status === 'error' ? (
          <Notice title={t('cartErrorTitle')} role="alert">
            <Button onClick={reload}>{t('partsRetry')}</Button>
          </Notice>
        ) : null}

        {state.status === 'ready' && items.length === 0 ? (
          <Notice title={t('cartEmptyTitle')} desc={t('cartEmptyDesc')}>
            <ButtonLink href="/vehicles" size="lg">
              {t('cartEmptyCta')}
              <ArrowIcon width={16} height={16} />
            </ButtonLink>
          </Notice>
        ) : null}

        {state.status === 'ready' && items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
            <ul className="space-y-3">
              {items.map((i) => {
                const avail = available(i);
                const photo = i.product.images?.[0]?.url;
                const over = avail < i.quantity;
                const atMax = i.quantity >= Math.min(MAX_QTY, avail);
                return (
                  <li key={i.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm md:p-4">
                    <div className="flex gap-3 md:gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 md:h-24 md:w-24">
                        {photo ? (
                          // Part photos come from arbitrary hosts, so next/image's remotePatterns can't be known.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={name(i)} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-slate-400" aria-hidden="true">
                            <PartsIcon width={30} height={30} strokeWidth={1.3} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="line-clamp-2 text-base font-bold leading-snug text-brand-ink md:text-lg">{name(i)}</h2>
                            {i.product.partCode ? (
                              <p className="mt-0.5 text-sm text-muted" dir="ltr" style={{ textAlign: 'start' }}>{i.product.partCode}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(i)}
                            aria-label={`${t('cartRemove')}: ${name(i)}`}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-ink/50 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-brand-ink"
                          >
                            <CloseIcon width={18} height={18} />
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {t('cartUnitPrice')}: <span className="font-semibold text-brand-ink" dir="ltr">{formatPrice(i.product.price, locale)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center rounded-xl border border-border bg-background">
                          <StepButton label={t('cartDec')} disabled={i.quantity <= 1 || busy[i.id]} onClick={() => setQuantity(i, i.quantity - 1)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
                          </StepButton>
                          <span className="min-w-10 text-center text-base font-extrabold text-brand-ink" aria-live="polite">{i.quantity}</span>
                          <StepButton label={t('cartInc')} disabled={atMax || busy[i.id]} onClick={() => setQuantity(i, i.quantity + 1)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>
                          </StepButton>
                        </div>
                        {avail === 0 ? (
                          <Badge tone="red">{t('cartUnavailable')}</Badge>
                        ) : over || (atMax && avail < MAX_QTY) ? (
                          <span className={`text-sm font-semibold ${over ? 'text-red-700' : 'text-muted'}`}>{t('cartMaxQty').replace('{n}', String(avail))}</span>
                        ) : null}
                      </div>
                      <p className="text-xl text-brand-ink" dir="ltr">
                        <PriceText value={formatPrice(Number(i.product.price) * i.quantity, locale)} />
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside aria-labelledby="cart-summary" className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 md:p-6">
              <h2 id="cart-summary" className="text-lg font-extrabold text-brand-ink">{t('cartSummary')}</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">{t('cartItemsTotal')} ({countLabel})</dt>
                  <dd className="font-semibold text-brand-ink" dir="ltr">{formatPrice(total, locale)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
                <span className="font-bold text-brand-ink">{t('total')}</span>
                <span className="text-3xl text-brand-ink" dir="ltr"><PriceText value={formatPrice(total, locale)} /></span>
              </div>

              {hasProblem ? (
                <span
                  aria-disabled="true"
                  className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-brand-lime/50 px-6 py-3.5 text-base font-semibold text-brand-ink/60"
                >
                  {t('checkout')}
                  <ArrowIcon width={16} height={16} />
                </span>
              ) : (
                <ButtonLink href="/checkout" size="lg" className="mt-5 w-full py-3.5">
                  {t('checkout')}
                  <ArrowIcon width={16} height={16} />
                </ButtonLink>
              )}
              <p className="mt-3 text-center text-xs text-muted">{t('cartNextStep')}</p>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm font-semibold">
                <Link href="/vehicles" className="inline-flex items-center gap-1.5 text-brand-ink underline underline-offset-4">
                  <CartIcon width={16} height={16} />
                  {t('cartContinue')}
                </Link>
                <button type="button" onClick={clear} className="text-muted underline underline-offset-4 transition hover:text-red-700">
                  {t('cartClear')}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-xl text-brand-ink transition hover:bg-brand-ink/10 focus-visible:outline-2 focus-visible:outline-brand-ink disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
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

function Notice({ title, desc, role, children }: { title: string; desc?: string; role?: 'alert'; children?: React.ReactNode }) {
  return (
    <div role={role} className="mx-auto flex max-w-xl flex-col items-center rounded-3xl bg-brand-ink px-6 py-14 text-center text-brand-bone">
      <CarLoader tone="bone" size="md" still />
      <h2 className="mt-6 text-xl font-extrabold md:text-2xl">{title}</h2>
      {desc ? <p className="mx-auto mt-2 max-w-md text-brand-bone/75">{desc}</p> : null}
      {children ? <div className="mt-7">{children}</div> : null}
    </div>
  );
}
