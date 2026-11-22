'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = () => apiGet('/orders?limit=100').then((d) => setOrders(d.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <table className="w-full text-sm border">
        <thead><tr className="bg-slate-50"><th className="p-2">Number</th><th className="p-2">Total</th><th className="p-2">Status</th><th className="p-2">Payment</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-2">{o.orderNumber}</td>
              <td className="p-2">{o.total}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2">{o.paymentStatus}</td>
              <td className="p-2">
                <select value={o.status} onChange={async (e) => { await apiPatch(`/orders/${o.id}/status`, { status: e.target.value }); load(); }} className="border rounded px-1">
                  {['PENDING_PAYMENT','PAID','PROCESSING','READY_FOR_PICKUP','SHIPPED','DELIVERED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
