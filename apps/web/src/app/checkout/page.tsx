'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function CheckoutPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    deliveryAddress: '',
    notes: '',
    paymentMethod: 'CASH',
    fulfillmentMethod: 'PICKUP',
  });
  const [loading, setLoading] = useState(false);
  const sessionId = typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || '') : '';

  const submit = async () => {
    setLoading(true);
    try {
      const order = await apiPost('/orders/checkout', { ...form, sessionId });
      router.push(`/orders/success/${order.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('checkout')}</h1>

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
        {locale === 'ar'
          ? 'برجاء العلم أن خدمة تركيب قطع الغيار متاحة داخل المركز. إذا كنت ترغب في تركيب القطع، يرجى اختيار الاستلام من الفرع، ويمكنك حجز موعد التركيب بعد إتمام الطلب.'
          : 'Please note that installation is available at our service center. If you wish to have your spare parts installed, please select Branch Pickup. You can request an installation appointment after completing your order.'}
      </div>

      <div className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder={t('fullName')} value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('mobile')} value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} />
        <div>
          <label className="block mb-1">{t('homeDelivery')} / {t('branchPickup')}</label>
          <select className="w-full border rounded px-3 py-2" value={form.fulfillmentMethod} onChange={(e) => setForm({ ...form, fulfillmentMethod: e.target.value })}>
            <option value="DELIVERY">{t('homeDelivery')}</option>
            <option value="PICKUP">{t('branchPickup')}</option>
          </select>
        </div>
        {form.fulfillmentMethod === 'DELIVERY' ? (
          <input className="w-full border rounded px-3 py-2" placeholder={t('address')} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
        ) : null}
        <div>
          <label className="block mb-1">{t('cash')} / {t('card')}</label>
          <select className="w-full border rounded px-3 py-2" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            <option value="CASH">{t('cash')}</option>
            <option value="CARD">{t('card')}</option>
          </select>
        </div>
        <textarea className="w-full border rounded px-3 py-2" placeholder={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button disabled={loading} onClick={submit} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">
          {loading ? '...' : t('submit')}
        </button>
      </div>
    </div>
  );
}
