'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function MarketplacePage() {
  const { t } = useLocale();
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    apiGet('/marketplace/listings').then((d) => setListings(d.items || [])).catch(() => setListings([]));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('sellYourCar')}</h1>
        <Link href="/marketplace/new" className="px-4 py-2 bg-blue-600 text-white rounded">{t('submitListing')}</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {listings.map((l) => (
          <Link key={l.id} href={`/marketplace/${l.id}`} className="border rounded p-4">
            <div className="aspect-video bg-slate-100 rounded mb-2 overflow-hidden">
              {l.images?.[0]?.url ? <img src={l.images[0].url} className="w-full h-full object-cover" /> : '🚗'}
            </div>
            <div className="font-semibold">{l.model?.name || 'Renault'} {l.year}</div>
            <div>{l.price}</div>
            <div className="text-sm text-slate-500">{l.mileage} km · {l.transmission} · {l.fuelType}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
