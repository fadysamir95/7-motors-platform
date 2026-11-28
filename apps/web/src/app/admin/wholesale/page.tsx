'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

export default function AdminWholesalePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const load = () => apiGet('/wholesale/requests?limit=100').then((d) => setRequests(d.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Wholesale Requests</h1>
      <table className="w-full text-sm border">
        <thead><tr className="bg-slate-50"><th className="p-2">Business</th><th className="p-2">Contact</th><th className="p-2">Phone</th><th className="p-2">Type</th><th className="p-2">Requested parts</th><th className="p-2">Received</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.businessName}</td>
              <td className="p-2">{r.contactPerson}</td>
              <td className="p-2" dir="ltr">{r.phone}</td>
              <td className="p-2">{r.businessType === 'PARTS_REQUEST' ? 'Parts request' : 'Wholesale'}</td>
              <td className="p-2">{(r.items || []).map((i: { productName?: string | null; partCode?: string | null; quantity: number }) => `${i.productName || i.partCode || '-'} ×${i.quantity}`).join(', ')}</td>
              <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2">
                <select value={r.status} onChange={async (e) => { await apiPatch(`/wholesale/requests/${r.id}/status`, { status: e.target.value }); load(); }} className="border rounded px-1">
                  {['NEW','CONTACTED','QUOTATION_SENT','NEGOTIATION','APPROVED','REJECTED','CLOSED'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
