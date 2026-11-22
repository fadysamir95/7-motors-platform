'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

function MarketplaceDetailPageContent() {
  const params = useParams();
  const id = params?.id as string;
  const { t } = useLocale();
  const [listing, setListing] = useState<any>(null);

  useEffect(() => {
    if (id) apiGet(`/marketplace/listings/${id}`).then(setListing).catch(() => setListing(null));
  }, [id]);

  if (!listing) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{listing.model?.name} {listing.year}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {listing.images?.map((img: any) => (
          <img key={img.id} src={img.url} className="w-full h-40 object-cover rounded" />
        ))}
      </div>
      <div className="space-y-1">
        <div>{t('askingPrice')}: {listing.price}</div>
        <div>{t('mileage')}: {listing.mileage}</div>
        <div>{t('transmission')}: {listing.transmission}</div>
        <div>{t('fuelType')}: {listing.fuelType}</div>
        <div>{t('condition')}: {listing.condition}</div>
        <div>{listing.description}</div>
      </div>
      <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded">Contact Seller</button>
    </div>
  );
}


export default function MarketplaceDetailPage() {
  return <Suspense fallback={<div>Loading...</div>}><MarketplaceDetailPageContent /></Suspense>;
}