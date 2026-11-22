'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function WholesalePage() {
  const { t } = useLocale();
  const [form, setForm] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    businessType: '',
    notes: '',
    items: [{ productName: '', partCode: '', quantity: 1 }],
  });

  const submit = async () => {
    try {
      await apiPost('/wholesale/requests', form);
      alert('Request submitted');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('wholesaleTitle')}</h1>
      <div className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder={t('businessName')} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('contactPerson')} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('mobile')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('whatsapp')} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('businessType')} value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">{t('requiredProduct')}</div>
          {form.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
              <input className="border rounded px-2 py-1" placeholder={t('requiredProduct')} value={it.productName} onChange={(e) => {
                const items = [...form.items]; items[idx].productName = e.target.value; setForm({ ...form, items });
              }} />
              <input className="border rounded px-2 py-1" placeholder="Part code" value={it.partCode} onChange={(e) => {
                const items = [...form.items]; items[idx].partCode = e.target.value; setForm({ ...form, items });
              }} />
              <input type="number" className="border rounded px-2 py-1" placeholder={t('quantity')} value={it.quantity} onChange={(e) => {
                const items = [...form.items]; items[idx].quantity = Number(e.target.value); setForm({ ...form, items });
              }} />
            </div>
          ))}
          <button className="text-sm text-blue-600" onClick={() => setForm({ ...form, items: [...form.items, { productName: '', partCode: '', quantity: 1 }] })}>+ Add item</button>
        </div>
        <textarea className="w-full border rounded px-3 py-2" placeholder={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button onClick={submit} className="w-full bg-blue-600 text-white py-2 rounded">{t('submitWholesale')}</button>
      </div>
    </div>
  );
}
