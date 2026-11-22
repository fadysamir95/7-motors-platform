'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const load = () => apiGet('/bookings?limit=100').then((d) => setBookings(d.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Bookings</h1>
      <table className="w-full text-sm border">
        <thead><tr className="bg-slate-50"><th className="p-2">Ref</th><th className="p-2">Customer</th><th className="p-2">Date</th><th className="p-2">Time</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-2">{b.bookingRef}</td>
              <td className="p-2">{b.fullName}</td>
              <td className="p-2">{b.date?.slice(0, 10)}</td>
              <td className="p-2">{b.startTime}</td>
              <td className="p-2">{b.status}</td>
              <td className="p-2">
                <select value={b.status} onChange={async (e) => { await apiPatch(`/bookings/${b.id}/status`, { status: e.target.value }); load(); }} className="border rounded px-1">
                  {['PENDING_CONFIRMATION','CONFIRMED','RESCHEDULED','COMPLETED','CANCELLED','REJECTED'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
