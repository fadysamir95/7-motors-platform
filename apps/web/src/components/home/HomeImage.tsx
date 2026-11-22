'use client';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';
import { homeImages, type HomeImageSlotKey } from '@/lib/home-images';
import { BoxIcon, CarIcon, PartsIcon, WrenchIcon } from '@/components/ui/Icons';

const ICONS = { car: CarIcon, wrench: WrenchIcon, parts: PartsIcon, box: BoxIcon };

/**
 * Renders the photo configured for a slot in lib/home-images.ts with next/image.
 * The wrapper is `relative overflow-hidden`; size it with `className` (e.g. an aspect ratio).
 * If a slot has `src: null`, a neutral branded placeholder is drawn instead.
 */
export default function HomeImage({
  slot,
  className = '',
  imgClassName = '',
}: {
  slot: HomeImageSlotKey;
  className?: string;
  imgClassName?: string;
}) {
  const { locale } = useLocale();
  const cfg = homeImages[slot];

  if (cfg.src) {
    return (
      <div className={`relative overflow-hidden bg-brand-navy ${className}`}>
        <Image
          src={cfg.src}
          alt={cfg.alt[locale]}
          fill
          sizes={cfg.sizes}
          priority={cfg.priority}
          placeholder={cfg.blur ? 'blur' : 'empty'}
          blurDataURL={cfg.blur}
          style={{ objectPosition: cfg.position }}
          className={`object-cover ${imgClassName}`}
        />
      </div>
    );
  }

  const Icon = ICONS[cfg.icon ?? 'car'];
  return (
    <div aria-hidden="true" className={`relative grid place-items-center overflow-hidden bg-brand-navy text-white/30 ${className}`}>
      <Icon width={64} height={64} strokeWidth={1.1} />
    </div>
  );
}
