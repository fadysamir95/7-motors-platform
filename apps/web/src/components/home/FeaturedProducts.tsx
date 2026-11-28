'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';

export default function FeaturedProducts() {
  const { locale } = useLocale();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/products?limit=8')
      .then((d) => setProducts(d.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const name = (p: any) => p.translations?.find((x: any) => x.locale === locale)?.name || p.translations?.[0]?.name || p.sku;

  if (!loading && products.length === 0) return null;
  return (
    <section className="container-xl py-16">
      <h2 className="text-3xl font-bold text-center text-brand-ink mb-10">منتجات مميزة</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden hover:shadow-lg transition">
              <div className="aspect-square bg-slate-100">
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt={name(p)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🔧</div>}
              </div>
              <CardBody className="p-4">
                <div className="font-semibold text-sm">{name(p)}</div>
                <div className="text-brand-ink font-bold mt-2">{p.price}</div>
                <div className="mt-2">
                  <Badge tone={p.inventory?.stock > 0 ? 'green' : 'red'}>{p.inventory?.stock > 0 ? 'متوفر' : 'غير متوفر'}</Badge>
                </div>
                <div className="mt-3">
                  <Link href={`/vehicles`}><Button size="sm" className="w-full">عرض</Button></Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
