import Hero from '@/components/home/Hero';
import ServiceSelection from '@/components/home/ServiceSelection';
import WholesaleBanner from '@/components/home/WholesaleBanner';
import FeaturedCars from '@/components/home/FeaturedCars';
import WhyMotors from '@/components/home/WhyMotors';
import HowItWorks from '@/components/home/HowItWorks';

export default function Home() {
  return (
    <>
      <Hero />
      <ServiceSelection />
      <WholesaleBanner />
      <FeaturedCars />
      <WhyMotors />
      <HowItWorks />
    </>
  );
}
