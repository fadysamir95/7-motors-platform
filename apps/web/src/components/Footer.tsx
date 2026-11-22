'use client';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function Footer() {
  const { t } = useLocale();
  return (
    <footer className="bg-brand-navy text-slate-200 mt-16">
      <div className="container-xl py-12 grid md:grid-cols-4 gap-8">
        <div>
          <div className="text-2xl font-black">7 <span className="text-brand-orange">MOTORS</span></div>
          <p className="mt-3 text-sm text-slate-300">Renault spare parts, maintenance, and car marketplace.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Navigation</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/vehicles" className="hover:text-brand-orange">Spare Parts</Link></li>
            <li><Link href="/booking" className="hover:text-brand-orange">Book Maintenance</Link></li>
            <li><Link href="/marketplace" className="hover:text-brand-orange">Sell Your Car</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Services</h4>
          <ul className="space-y-2 text-sm">
            <li>Renault Spare Parts</li>
            <li>Vehicle Maintenance</li>
            <li>Car Listings</li>
            <li>Wholesale</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>Phone: +20 100 000 0000</li>
            <li>Email: info@7motors.com</li>
            <li>Cairo, Egypt</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
        © 2026 7 MOTORS. All rights reserved.
      </div>
    </footer>
  );
}
