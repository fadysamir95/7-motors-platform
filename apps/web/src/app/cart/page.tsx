'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function CartPage() {
  const { t, locale } = useLocale();
  const [cart, setCart] = useState<any>(null);
  const sessionId = typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || '') : '';

  const load = () => {
    apiGet(`/cart?sessionId=${sessionId}`).then(setCart).catch(() => setCart(null));
  };
  useEffect(() => { load(); }, []);

  const name = (p: any) => p.translations?.find((x: any) => x.locale === locale)?.name || p.translations?.[0]?.name || p.sku;

  const total = cart?.items?.reduce((s: number, i: any) => s + Number(i.product.price) * i.quantity, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('cart')}</h1>
      {!cart?.items?.length ? <p>Empty cart</p> : null}
      <div className="space-y-3">
        {cart?.items?.map((i: any) => (
          <div key={i.id} className="flex items-center gap-4 border rounded p-3">
            <div className="flex-1">
              <div className="font-semibold">{name(i.product)}</div>
              <div className="text-sm text-slate-500">{i.product.partCode}</div>
            </div>
            <input
              type="number"
              min={1}
              value={i.quantity}
              onChange={async (e) => {
                await apiPatch(`/cart/items/${i.id}?sessionId=${sessionId}`, { quantity: Number(e.target.value) });
                load();
              }}
              className="w-16 border rounded px-2 py-1"
            />
            <div>{Number(i.product.price) * i.quantity}</div>
            <button onClick={async () => { await apiDelete(`/cart/items/${i.id}?sessionId=${sessionId}`); load(); }} className="text-red-500">✕</button>
          </div>
        ))}
      </div>
      {cart?.items?.length ? (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-xl font-bold">{t('total')}: {total}</div>
          <Link href="/checkout" className="px-4 py-2 bg-blue-600 text-white rounded">{t('checkout')}</Link>
        </div>
      ) : null}
    </div>
  );
}
