'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function NewListingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [models, setModels] = useState<any[]>([]);
  const [form, setForm] = useState({
    modelId: '',
    year: 2020,
    price: '',
    mileage: '',
    transmission: 'Manual',
    fuelType: 'Petrol',
    condition: 'Good',
    description: '',
  });
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    apiGet('/vehicles?active=true').then(setModels).catch(() => {});
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr: string[] = [];
    for (const f of Array.from(files).slice(0, 5)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });
      arr.push(dataUrl);
    }
    setImages(arr);
  };

  const submit = async () => {
    if (images.length !== 5) {
      alert('Exactly 5 photos required');
      return;
    }
    try {
      await apiPost('/marketplace/listings', { ...form, price: Number(form.price), mileage: Number(form.mileage), images });
      alert('Submitted for review');
      router.push('/marketplace');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('submitListing')}</h1>
      <div className="space-y-3">
        <select className="w-full border rounded px-3 py-2" value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
          <option value="">-- {t('model')} --</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="number" className="w-full border rounded px-3 py-2" placeholder={t('year')} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
        <input type="number" className="w-full border rounded px-3 py-2" placeholder={t('askingPrice')} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input type="number" className="w-full border rounded px-3 py-2" placeholder={t('mileage')} value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
        <select className="w-full border rounded px-3 py-2" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
          <option>Manual</option>
          <option>Automatic</option>
        </select>
        <select className="w-full border rounded px-3 py-2" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
          <option>Petrol</option>
          <option>Diesel</option>
        </select>
        <select className="w-full border rounded px-3 py-2" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
          <option>Excellent</option>
          <option>Good</option>
          <option>Fair</option>
        </select>
        <textarea className="w-full border rounded px-3 py-2" placeholder={t('description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div>
          <label className="block mb-1">{t('uploadPhotos')} (5)</label>
          <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
          <div className="text-sm text-slate-500 mt-1">{images.length}/5</div>
        </div>
        <button onClick={submit} className="w-full bg-blue-600 text-white py-2 rounded">{t('submitListing')}</button>
      </div>
    </div>
  );
}
