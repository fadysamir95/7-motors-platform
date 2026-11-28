'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';
import VehicleImage from '@/components/VehicleImage';

export default function VehiclesPage() {
  const { t } = useLocale();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/vehicles?active=true')
      .then((d) => setModels(Array.isArray(d) ? d : d.items || []))
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = models.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="container-xl py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Find Parts for Your Renault</h1>
        <p className="text-muted mt-2">Select your vehicle to discover compatible spare parts.</p>
      </div>

      <div className="max-w-md mx-auto mb-8">
        <input
          className="w-full border border-border rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-lime-dark/60"
          placeholder="Search vehicle model..."
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
            <Link key={m.id} href={`/vehicles/${m.id}`} onClick={() => setSelected(m.id)}>
              <Card className={`overflow-hidden hover:shadow-lg transition group ${selected === m.id ? 'ring-2 ring-brand-lime-dark' : ''}`}>
                <VehicleImage slug={m.slug} name={m.name} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" className="aspect-[4/3]" imgClassName="group-hover:scale-105 transition duration-300" />
                <CardBody className="p-4">
                  <div className="font-bold text-brand-ink">{m.name}</div>
                  <div className="text-sm text-muted mt-1">2010 - Present</div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 ? (
        <div className="text-center text-muted mt-8">No vehicles found.</div>
      ) : null}
    </div>
  );
}
