'use client';
import Hero from '@/components/home/Hero';
import ServiceSelection from '@/components/home/ServiceSelection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import WhyMotors from '@/components/home/WhyMotors';
import FinalCTA from '@/components/home/FinalCTA';

export default function Home() {
  return (
    <div>
      <Hero />
      <ServiceSelection />
      <FeaturedProducts />
      <WhyMotors />
      <FinalCTA />
    </div>
  );
}
