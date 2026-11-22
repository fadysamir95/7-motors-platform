'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import VehicleImage from '@/components/VehicleImage';
import { PartsIcon } from '@/components/ui/Icons';

function VehicleDetailPageContent() {
  const params = useParams();
  const id = params?.id as string;
  const { t, locale } = useLocale();
  const [model, setModel] = useState<any>(null);
  const [year, setYear] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2009 }, (_, i) => currentYear - i).filter((y) => y >= 2010);

  useEffect(() => {
    if (!id) return;
    apiGet(`/vehicles/${id}`).then(setModel).catch(() => setModel(null));
  }, [id]);

  useEffect(() => {
    if (!id || !year) return;
    apiGet(`/products?modelId=${id}&year=${year}&limit=50`).then((d) => setProducts(d.items || [])).catch(() => setProducts([]));
  }, [id, year]);

  const name = (p: any) => p.translations?.find((x: any) => x.locale === locale)?.name || p.translations?.[0]?.name || p.sku;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        {model ? <VehicleImage slug={model.slug} name={model.name} sizes="96px" className="h-16 w-24 shrink-0 rounded-lg" /> : null}
        <div>
          <h1 className="text-2xl font-bold">{model?.name || 'Vehicle'}</h1>
          <Link href="/vehicles" className="text-sm text-brand-blue hover:underline">Change vehicle</Link>
        </div>
      </div>
      <div className="mb-4">
        <label className="block mb-1">{t('selectYear')}</label>
        <select className="border rounded px-3 py-2" value={year ?? ''} onChange={(e) => setYear(Number(e.target.value))}>
          <option value="">--</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {!year ? <p>{t('selectYear')}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id}>
            <Card className="overflow-hidden hover:shadow-md transition">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt={name(p)} className="w-full h-full object-cover" /> : <PartsIcon width={40} height={40} className="text-slate-400" />}
              </div>
              <CardBody>
                <div className="font-semibold">{name(p)}</div>
                <div className="text-sm text-muted">{p.partCode}</div>
                <div className="text-sm text-muted">{t('countryOfOrigin')}: {p.countryOfOrigin}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-lg font-bold text-brand-navy">{p.price}</div>
                  <Badge tone={p.inventory?.stock > 0 ? 'green' : 'red'}>{p.inventory?.stock > 0 ? t('available') : t('outOfStock')}</Badge>
                </div>
                <Button className="mt-3 w-full" disabled={!p.inventory?.stock} onClick={async () => {
                  const sessionId = localStorage.getItem('sessionId') || (() => { const s = crypto.randomUUID(); localStorage.setItem('sessionId', s); return s; })();
                  await (await import('@/lib/api')).apiPost('/cart/items?sessionId=' + sessionId, { productId: p.id, quantity: 1 });
                  alert('Added');
                }}>
                  {t('addToCart')}
                </Button>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function VehicleDetailPage() {
  return <Suspense fallback={<div>Loading...</div>}><VehicleDetailPageContent /></Suspense>;
}