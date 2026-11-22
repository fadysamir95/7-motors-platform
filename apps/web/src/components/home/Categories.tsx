'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';

const fallback = [
  { name: 'محرك', icon: '⚙️' },
  { name: 'فرامل', icon: '🛑' },
  { name: 'عفشة', icon: '🔧' },
  { name: 'فلاتر', icon: '🌀' },
  { name: 'تبريد', icon: '❄️' },
  { name: 'كهرباء', icon: '⚡' },
  { name: 'فتيس', icon: '🔩' },
  { name: 'هيكل السيارة', icon: '🚗' },
];

export default function Categories() {
  const [cats, setCats] = useState<any[]>([]);
  useEffect(() => {
    apiGet('/categories').then((d) => setCats(Array.isArray(d) ? d : d.items || [])).catch(() => setCats([]));
  }, []);

  const list = cats.length ? cats.map((c) => ({ name: c.translations?.find((t: any) => t.locale === 'ar')?.name || c.translations?.[0]?.name || c.slug, icon: '🔧' })) : fallback;

  return (
    <section className="container-xl py-16">
      <h2 className="text-3xl font-bold text-center text-brand-navy mb-10">تصفح حسب الفئة</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {list.map((c, i) => (
          <Card key={i} className="hover:shadow-md transition cursor-pointer">
            <CardBody className="p-6 text-center">
              <div className="text-4xl mb-3">{c.icon}</div>
              <div className="font-semibold text-brand-navy">{c.name}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
