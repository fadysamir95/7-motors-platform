'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0B172B] min-h-[85vh]">
      <div className="container-xl grid md:grid-cols-2 min-h-[85vh] items-center gap-8 py-12">
        <div className="text-white">
          <h1 className="text-4xl md:text-6xl font-black leading-tight">
            كل ما تحتاجه سيارتك، <span className="text-brand-orange">في مكان واحد.</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-slate-200 max-w-xl">
            قطع غيار رينو، صيانة متخصصة، وخدمات متكاملة لسيارتك.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/vehicles">
              <Button size="lg" className="gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                اكتشف خدماتنا
              </Button>
            </Link>
            <Link href="/booking">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                احجز صيانة سيارتك
              </Button>
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-white/80 flex-wrap">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              قطع غيار أصلية
            </div>
            <span className="opacity-40">|</span>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              صيانة احترافية
            </div>
            <span className="opacity-40">|</span>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              دعم فني متكامل
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -left-10 top-10 w-72 h-72 bg-brand-orange/20 rotate-12 rounded-3xl blur-2xl" />
          <div className="absolute -right-10 bottom-10 w-60 h-60 bg-brand-orange/10 -rotate-12 rounded-3xl blur-2xl" />
          <img
            src="https://commons.wikimedia.org/wiki/Special:FilePath/Renault_Duster_2020_(Russia).jpg"
            alt="Renault Duster"
            className="relative z-10 w-full h-auto object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
