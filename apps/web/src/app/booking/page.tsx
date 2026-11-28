'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

import { Suspense } from 'react';
function BookingContent() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [models, setModels] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    licenseNumber: '',
    modelId: '',
    vin: '',
    vehicleYear: 2020,
    serviceTypeIds: [] as string[],
    date: '',
    startTime: '',
    notes: '',
  });

  useEffect(() => {
    apiGet('/vehicles?active=true').then(setModels).catch(() => {});
    apiGet('/bookings/service-types').then((d) => setServiceTypes(Array.isArray(d) ? d : d.items || [])).catch(() => {});
  }, []);

  // service-types endpoint not yet implemented; fetch via? We'll add. For now empty.

  useEffect(() => {
    if (form.date) {
      apiGet(`/bookings/slots?date=${form.date}`).then((d) => setSlots(Array.isArray(d) ? d : [])).catch(() => setSlots([]));
    }
  }, [form.date]);

  const submit = async () => {
    try {
      const payload = { ...form, orderId: orderId || undefined };
      await apiPost('/bookings', payload);
      alert('Booking submitted');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const name = (st: any) => st.translations?.find((x: any) => x.locale === locale)?.name || st.translations?.[0]?.name || st.slug;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('booking')}</h1>
      <div className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder={t('fullName')} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('mobile')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder={t('licenseNumber')} value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
        <select className="w-full border rounded px-3 py-2" value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
          <option value="">-- {t('model')} --</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input className="w-full border rounded px-3 py-2" placeholder={t('vin')} value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
        <input type="number" className="w-full border rounded px-3 py-2" placeholder={t('year')} value={form.vehicleYear} onChange={(e) => setForm({ ...form, vehicleYear: Number(e.target.value) })} />
        <div>
          <label className="block mb-1">{t('serviceType')}</label>
          <div className="grid grid-cols-2 gap-2">
            {serviceTypes.map((st) => (
              <label key={st.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.serviceTypeIds.includes(st.id)}
                  onChange={(e) => {
                    if (e.target.checked) setForm({ ...form, serviceTypeIds: [...form.serviceTypeIds, st.id] });
                    else setForm({ ...form, serviceTypeIds: form.serviceTypeIds.filter((x) => x !== st.id) });
                  }}
                />
                {name(st)}
              </label>
            ))}
          </div>
        </div>
        <input type="date" className="w-full border rounded px-3 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <div>
          <label className="block mb-1">{t('selectSlot')}</label>
          <div className="grid grid-cols-5 gap-2">
            {slots.map((s) => (
              <button
                key={s.startTime}
                disabled={!s.available}
                onClick={() => setForm({ ...form, startTime: s.startTime })}
                className={`py-2 rounded text-sm ${form.startTime === s.startTime ? 'bg-brand-ink text-brand-bone' : 'bg-slate-100'} disabled:opacity-40`}
              >
                {s.startTime}
              </button>
            ))}
          </div>
          {!slots.length ? <p className="text-sm text-slate-500">{t('noSlots')}</p> : null}
        </div>
        <textarea className="w-full border rounded px-3 py-2" placeholder={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button onClick={submit} className="w-full bg-brand-lime font-semibold text-brand-ink hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] py-2 rounded">{t('submitBooking')}</button>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return <Suspense fallback={<div>Loading...</div>}><BookingContent /></Suspense>;
}
