'use client';
import Image from 'next/image';
import { vehicleImage } from '@/lib/vehicle-images';
import { CarIcon } from '@/components/ui/Icons';

/**
 * Renault model photo for a VehicleModel. Uses the local, optimized image mapped by slug
 * (lib/vehicle-images.ts). Models without a licensed Renault photo get a neutral light placeholder, never an unrelated image or a hotlinked URL.
 */
export default function VehicleImage({
  slug,
  name,
  className = '',
  sizes,
  imgClassName = '',
  tone = 'light',
}: {
  slug?: string | null;
  name: string;
  className?: string;
  sizes: string;
  imgClassName?: string;
  /** Placeholder style for models without a photo: light tile, or dark when text is laid over the image. */
  tone?: 'light' | 'dark';
}) {
  const img = vehicleImage(slug);
  return (
    <div className={`relative overflow-hidden bg-brand-ink ${className}`}>
      {img ? (
        <Image
          src={img.src}
          alt={name}
          fill
          sizes={sizes}
          placeholder="blur"
          blurDataURL={img.blur}
          className={`object-cover ${imgClassName}`}
        />
      ) : (
        <div className={`grid h-full w-full place-items-center ${tone === 'dark' ? 'bg-linear-to-br from-brand-ink-soft to-brand-ink text-brand-bone/25' : 'bg-linear-to-br from-slate-200 to-slate-100 text-brand-ink/30'}`} role="img" aria-label={name}>
          <CarIcon width={48} height={48} strokeWidth={1.2} />
        </div>
      )}
    </div>
  );
}
