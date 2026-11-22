'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

export default function AdminListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const load = () => apiGet('/marketplace/admin/listings?limit=100').then((d) => setListings(d.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Car Listings</h1>
      <table className="w-full text-sm border">
        <thead><tr className="bg-slate-50"><th className="p-2">Model</th><th className="p-2">Year</th><th className="p-2">Price</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="p-2">{l.model?.name}</td>
              <td className="p-2">{l.year}</td>
              <td className="p-2">{l.price}</td>
              <td className="p-2">{l.status}</td>
              <td className="p-2">
                <select value={l.status} onChange={async (e) => { await apiPatch(`/marketplace/admin/listings/${l.id}/status`, { status: e.target.value }); load(); }} className="border rounded px-1">
                  {['PENDING_REVIEW','APPROVED','REJECTED','PUBLISHED','SOLD','EXPIRED'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
