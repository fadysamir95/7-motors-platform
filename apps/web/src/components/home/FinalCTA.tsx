'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function FinalCTA() {
  return (
    <section className="container-xl py-20 text-center">
      <h2 className="text-4xl font-black text-brand-ink">سيارتك تستحق الأفضل.</h2>
      <p className="text-muted mt-3 text-lg">ابدأ رحلتك مع MOTORS 7 واكتشف خدماتنا.</p>
      <div className="mt-8">
        <Link href="/vehicles"><Button size="lg">اكتشف خدماتنا</Button></Link>
      </div>
    </section>
  );
}
