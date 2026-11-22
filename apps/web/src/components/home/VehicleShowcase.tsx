'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';

export default function VehicleShowcase() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiGet('/vehicles?active=true')
      .then((d) => setModels(Array.isArray(d) ? d : d.items || []))
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = models.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="container-xl py-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-brand-navy">اختار عربيتك</h2>
        <p className="text-muted mt-2">حدد موديل سيارتك للوصول إلى قطع الغيار المناسبة ليها.</p>
      </div>
      <div className="max-w-md mx-auto mb-8">
        <input
          className="w-full border border-border rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          placeholder="ابحث عن موديل..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <Link key={m.id} href={`/vehicles/${m.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition group">
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🚗</div>
                  )}
                </div>
                <CardBody className="p-4">
                  <div className="font-bold text-brand-navy">{m.name}</div>
                  <div className="text-sm text-muted mt-1">2010 - Present</div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <div className="text-center mt-8">
        <Link href="/vehicles" className="text-brand-blue hover:underline">عرض جميع المركبات</Link>
      </div>
    </section>
  );
}
