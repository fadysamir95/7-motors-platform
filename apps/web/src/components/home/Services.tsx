'use client';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const services = [
  { title: 'قطع غيار رينو', desc: 'اكتشف مجموعة قطع الغيار المناسبة لسيارتك.', cta: 'تصفح القطع', href: '/vehicles', img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Renault_Megane_3_Version_2014.jpg' },
  { title: 'صيانة سيارتك', desc: 'احجز خدمة الصيانة المناسبة لسيارتك.', cta: 'احجز الآن', href: '/booking', img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Renault-Duster.JPG' },
  { title: 'بيع سيارتك', desc: 'اعرض سيارتك للبيع من خلال منصتنا.', cta: 'اعرض سيارتك', href: '/marketplace', img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Renault_Duster_2020_(Russia).jpg' },
];

export default function Services() {
  return (
    <section className="bg-[#F5F7FA] py-16">
      <div className="container-xl">
        <h2 className="text-3xl font-bold text-center text-brand-navy mb-10">خدماتنا</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s) => (
            <Card key={s.title} className="overflow-hidden hover:shadow-lg transition group">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
              </div>
              <CardBody className="p-6">
                <h3 className="text-xl font-bold text-brand-navy">{s.title}</h3>
                <p className="text-muted mt-2">{s.desc}</p>
                <div className="mt-4">
                  <Link href={s.href}><Button variant="secondary">{s.cta}</Button></Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
