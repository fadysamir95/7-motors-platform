'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

function OrderSuccessPageContent() {
  const params = useParams();
  const id = params?.id as string;
  const { t } = useLocale();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (id) apiGet(`/orders/${id}`).then(setOrder).catch(() => setOrder(null));
  }, [id]);

  if (!order) return <div className="p-8">Loading...</div>;

  const wantsInstall = order.fulfillmentMethod === 'PICKUP';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">{t('success')}</h1>
      <div className="border rounded p-4 text-left space-y-2">
        <div>{t('orderNumber')}: {order.orderNumber}</div>
        <div>{t('total')}: {order.total}</div>
        <div>Payment: {order.paymentStatus}</div>
        <div>Fulfillment: {order.fulfillmentMethod}</div>
      </div>
      {wantsInstall ? (
        <div className="mt-6">
          <button
            onClick={() => router.push(`/booking?orderId=${order.id}`)}
            className="px-6 py-3 bg-brand-lime font-semibold text-brand-ink hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] rounded text-lg"
          >
            {t('bookInstallation')}
          </button>
        </div>
      ) : null}
      <div className="mt-4">
        <Link href="/" className="font-semibold text-brand-ink underline underline-offset-4">Home</Link>
      </div>
    </div>
  );
}


export default function OrderSuccessPage() {
  return <Suspense fallback={<div>Loading...</div>}><OrderSuccessPageContent /></Suspense>;
}