'use client';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const services = [
  {
    title: 'قطع غيار رينو',
    desc: 'دور على قطع الغيار المناسبة لعربيتك بسهولة.',
    cta: 'تصفح قطع الغيار',
    href: '/vehicles',
    img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Renault_Megane_3_Version_2014.jpg',
    primary: true,
  },
  {
    title: 'حجز صيانة',
    desc: 'احجز خدمة الصيانة المناسبة لعربيتك وحدد الموعد اللي يناسبك.',
    cta: 'احجز الآن',
    href: '/booking',
    img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Renault-Duster.JPG',
    primary: false,
  },
  {
    title: 'بيع سيارتك',
    desc: 'اعرض عربيتك للبيع ووصل للمشترين المهتمين.',
    cta: 'اعرض سيارتك',
    href: '/marketplace',
    img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Renault_Duster_2020_(Russia).jpg',
    primary: false,
  },
];

export default function ServiceSelection() {
  return (
    <section className="container-xl py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-brand-navy">إزاي نقدر نساعدك النهارده؟</h2>
        <p className="text-muted mt-2">اختار الخدمة اللي محتاجها وابدأ رحلتك مع MOTORS 7.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {services.map((s) => (
          <Card key={s.title} className={`overflow-hidden hover:shadow-lg transition group ${s.primary ? 'ring-2 ring-brand-orange/40' : ''}`}>
            <div className={`overflow-hidden ${s.primary ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
              <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            </div>
            <CardBody className="p-6">
              <h3 className={`font-bold text-brand-navy ${s.primary ? 'text-2xl' : 'text-xl'}`}>{s.title}</h3>
              <p className="text-muted mt-2">{s.desc}</p>
              <div className="mt-4">
                <Link href={s.href}>
                  <Button variant={s.primary ? 'primary' : 'secondary'}>{s.cta}</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
