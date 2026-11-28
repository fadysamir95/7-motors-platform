'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [form, setForm] = useState({ sku: '', nameAr: '', nameEn: '', price: '', partCode: '', countryOfOrigin: '', modelId: '', year: 2020 });

  const load = () => apiGet('/products?limit=100').then((d) => setProducts(d.items || [])).catch(() => {});
  useEffect(() => { load(); apiGet('/vehicles?active=true').then(setModels).catch(() => {}); }, []);

  const create = async () => {
    try {
      await apiPost('/products', {
        sku: form.sku,
        partCode: form.partCode,
        countryOfOrigin: form.countryOfOrigin,
        price: Number(form.price),
        translations: [
          { locale: 'ar', name: form.nameAr },
          { locale: 'en', name: form.nameEn },
        ],
        compatibility: form.modelId ? [{ modelId: form.modelId, years: [Number(form.year)] }] : [],
      });
      load();
      alert('Created');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="grid md:grid-cols-4 gap-2 mb-6">
        <input className="border rounded px-2 py-1" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Name AR" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Name EN" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Part code" value={form.partCode} onChange={(e) => setForm({ ...form, partCode: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Country" value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })} />
        <select className="border rounded px-2 py-1" value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
          <option value="">Model</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="number" className="border rounded px-2 py-1" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
        <button onClick={create} className="bg-brand-lime font-semibold text-brand-ink hover:bg-[color-mix(in_srgb,var(--lime)_82%,white)] rounded px-3">Create</button>
      </div>
      <table className="w-full text-sm border">
        <thead><tr className="bg-slate-50"><th className="p-2">SKU</th><th className="p-2">Name</th><th className="p-2">Price</th><th className="p-2">Stock</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.sku}</td>
              <td className="p-2">{p.translations?.[0]?.name}</td>
              <td className="p-2">{p.price}</td>
              <td className="p-2">{p.inventory?.stock}</td>
              <td className="p-2"><button onClick={async () => { await apiDelete(`/products/${p.id}`); load(); }} className="text-red-500">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
