'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => apiGet('/notifications').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`border rounded p-3 ${n.isRead ? 'opacity-60' : ''}`}>
            <div className="font-semibold">{n.title}</div>
            <div className="text-sm text-muted">{n.body}</div>
            {!n.isRead ? <button onClick={async () => { await apiPatch(`/notifications/${n.id}/read`); load(); }} className="text-sm font-semibold text-brand-ink underline underline-offset-4 mt-1">Mark read</button> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
