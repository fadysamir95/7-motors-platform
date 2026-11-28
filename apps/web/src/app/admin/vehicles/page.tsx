'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

export default function AdminVehiclesPage() {
  const [models, setModels] = useState<any[]>([]);
  const [form, setForm] = useState({ slug: '', name: '' });
  const load = () => apiGet('/vehicles').then(setModels).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    await apiPost('/vehicles', form);
    setForm({ slug: '', name: '' });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Vehicles</h1>
      <div className="flex gap-2 mb-4">
        <input className="border rounded px-2 py-1" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <button onClick={create} className="bg-brand-lime font-semibold text-brand-ink hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] rounded px-3">Create</button>
      </div>
      <ul className="space-y-1">
        {models.map((m) => <li key={m.id} className="border rounded px-3 py-2">{m.name} ({m.slug})</li>)}
      </ul>
    </div>
  );
}
