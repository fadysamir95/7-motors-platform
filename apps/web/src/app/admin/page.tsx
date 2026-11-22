'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function AdminDashboard() {
  const { t } = useLocale();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiGet('/dashboard/overview').then(setData).catch(() => setData(null));
  }, []);

  const cards = data ? [
    ['Total Revenue', data.totalRevenue],
    ['Total Orders', data.totalOrders],
    ['Pending Orders', data.pendingOrders],
    ['Completed Orders', data.completedOrders],
    ['Total Products', data.totalProducts],
    ['Low Stock', data.lowStockProducts],
    ['Customers', data.totalCustomers],
    ['Pending Bookings', data.pendingBookings],
    ['Confirmed Bookings', data.confirmedBookings],
    ['Wholesale Requests', data.wholesaleRequests],
    ['Pending Listings', data.pendingListings],
    ['Published Listings', data.publishedListings],
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('admin')}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map(([label, val]) => (
          <div key={label} className="border rounded p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-2xl font-bold">{val}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/admin/products" className="p-3 border rounded text-center">Products</Link>
        <Link href="/admin/orders" className="p-3 border rounded text-center">Orders</Link>
        <Link href="/admin/bookings" className="p-3 border rounded text-center">Bookings</Link>
        <Link href="/admin/listings" className="p-3 border rounded text-center">Listings</Link>
        <Link href="/admin/wholesale" className="p-3 border rounded text-center">Wholesale</Link>
        <Link href="/admin/vehicles" className="p-3 border rounded text-center">Vehicles</Link>
        <Link href="/admin/notifications" className="p-3 border rounded text-center">Notifications</Link>
      </div>
    </div>
  );
}
