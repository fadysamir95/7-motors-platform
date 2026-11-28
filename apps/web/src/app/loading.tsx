import CarLoader from '@/components/ui/CarLoader';

/** Shown while a page is loading. It fades in after a short delay so fast navigations do not flash it. */
export default function Loading() {
  return (
    <div className="loader-delayed grid min-h-[60vh] place-items-center px-4">
      <CarLoader size="lg" />
    </div>
  );
}
