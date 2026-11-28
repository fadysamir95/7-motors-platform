'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { useLocale } from '@/components/LocaleProvider';
import { ButtonLink } from '@/components/ui/Button';
import PriceText from '@/components/PriceText';
import { ArrowIcon, CheckIcon, WrenchIcon } from '@/components/ui/Icons';

type Summary = {
  id: string;
  orderNumber?: string;
  total?: string | number;
  paymentMethod?: 'CASH' | 'CARD';
  paymentStatus?: string;
  fulfillmentMethod?: 'PICKUP' | 'DELIVERY';
};

function readSummary(id: string): Summary | null {
  try {
    const raw = sessionStorage.getItem('lastOrder');
    const parsed = raw ? (JSON.parse(raw) as Summary) : null;
    return parsed && parsed.id === id ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Order confirmation. The order endpoint is staff-only, so the details come from the summary that checkout
 * stored for this visit. If it is missing (a reload in a new tab, say) the page still confirms the order using
 * its reference.
 */
export default function OrderSuccessPage() {
  const params = useParams();
  const id = params?.id as string;
  const { t, locale } = useLocale();
  const [order, setOrder] = useState<Summary | null | undefined>(undefined);

  useEffect(() => {
    Promise.resolve().then(() => setOrder(readSummary(id)));
  }, [id]);

  if (order === undefined) return <div className="min-h-[50vh]" aria-busy="true" />;

  const reference = order?.orderNumber ?? String(id).slice(0, 8).toUpperCase();
  const pickup = order?.fulfillmentMethod === 'PICKUP';
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t('orderNumber'), value: <span className="font-mono font-bold" dir="ltr">{reference}</span> },
    ...(order?.total !== undefined ? [{ label: t('total'), value: <span className="text-xl" dir="ltr"><PriceText value={formatPrice(order.total, locale)} /></span> }] : []),
    ...(order?.paymentMethod ? [{ label: t('okPayment'), value: `${order.paymentMethod === 'CASH' ? t('cash') : t('card')} · ${order.paymentStatus === 'PAID' ? t('okPaid') : t('okPending')}` }] : []),
    ...(order?.fulfillmentMethod ? [{ label: t('okFulfillment'), value: pickup ? t('branchPickup') : t('homeDelivery') }] : []),
  ];

  return (
    <div>
      <section className="bg-brand-ink text-brand-bone">
        <div className="container-xl py-8 md:py-10">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold" aria-label={`${t('coStepCart')} → ${t('coStepDetails')} → ${t('coStepDone')}`}>
            {[t('coStepCart'), t('coStepDetails')].map((label) => (
              <li key={label} className="inline-flex items-center gap-3 text-brand-bone/70">
                <span className="inline-flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-bone/15"><CheckIcon width={14} height={14} strokeWidth={3} /></span>
                  {label}
                </span>
                <span aria-hidden="true" className="h-px w-6 bg-brand-bone/30" />
              </li>
            ))}
            <li className="inline-flex items-center gap-2 text-brand-lime" aria-current="step">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-lime text-brand-ink"><CheckIcon width={14} height={14} strokeWidth={3} /></span>
              {t('coStepDone')}
            </li>
          </ol>
        </div>
      </section>

      <div className="container-xl py-10 md:py-14">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-lime text-brand-ink shadow-[0_0_0_10px_rgb(198_245_63/0.25)]">
            <CheckIcon width={38} height={38} strokeWidth={2.5} />
          </div>
          <h1 className="font-display mt-6 text-3xl font-extrabold text-brand-ink md:text-4xl">{t('okTitle')}</h1>
          <p className="mt-2 text-muted">{t('okDesc')}</p>

          <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card text-start shadow-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm text-muted">{r.label}</dt>
                <dd className="text-end font-semibold text-brand-ink">{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-muted">{t('okKeep')}</p>

          <div className="mt-8 rounded-2xl bg-brand-ink p-6 text-start text-brand-bone">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-lime text-brand-ink"><WrenchIcon width={22} height={22} /></span>
              <div>
                <h2 className="text-lg font-extrabold">{t('okInstallTitle')}</h2>
                <p className="mt-1 text-sm text-brand-bone/75">{t('okInstallDesc')}</p>
              </div>
            </div>
            <ButtonLink href={`/booking?orderId=${id}`} size="lg" className="mt-5 w-full">
              {t('okBookCta')}
              <ArrowIcon width={16} height={16} />
            </ButtonLink>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-brand-ink">
            <Link href="/vehicles" className="underline underline-offset-4">{t('cartContinue')}</Link>
            <Link href="/" className="underline underline-offset-4">{t('home')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
