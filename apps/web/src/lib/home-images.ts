/**
 * Homepage imagery configuration (single source of truth).
 *
 * Files live in `public/images/home/` as optimized WebP and are rendered with next/image.
 * To replace a photo: overwrite the file (or point `src` at a new one), then update
 * `width`/`height`/`alt`. Credits and licensing: `public/images/CREDITS.md`.
 * Set `src: null` to fall back to the branded placeholder for a slot.
 */
export type HomeImageSlotKey = 'hero' | 'parts' | 'booking' | 'sell' | 'wholesale';

export type HomeImageSlot = {
  /** Path under /public, or null to render the branded placeholder. */
  src: string | null;
  width: number;
  height: number;
  /** Tiny base64 preview shown while the image loads. */
  blur?: string;
  alt: { ar: string; en: string };
  /** CSS object-position, used to keep the subject in frame when cropped. */
  position?: string;
  sizes: string;
  priority?: boolean;
  /** Placeholder icon, only used when `src` is null. */
  icon?: 'car' | 'wrench' | 'parts' | 'box';
};

export const homeImages: Record<HomeImageSlotKey, HomeImageSlot> = {
  hero: {
    src: '/images/home/hero.webp',
    width: 1672,
    height: 941,
    blur: 'data:image/webp;base64,UklGRmgAAABXRUJQVlA4IFwAAAAQAgCdASoQAAkAA4BaJQBOgCBYQebpge6gAP7tDsgqNv3Y0Hs2PrpYpP7/LWwq8nrGjwGZnjYuO38DsJQeD0JCsEt5TCaExRil8tkxvdN5egGIODm/o4T2bQAAAA==',
    alt: { ar: 'سيارة رينو كوليوس بيضاء أمام معرض رينو وقت الغروب', en: 'A white Renault Koleos in front of a Renault showroom at sunset' },
    position: '50% 55%',
    sizes: '(min-width: 1024px) 72vw, 100vw',
    priority: true,
  },
  parts: {
    src: '/images/home/parts.webp',
    width: 1200,
    height: 825,
    blur: 'data:image/webp;base64,UklGRnQAAABXRUJQVlA4IGgAAABQAgCdASoQAAsAA4BaJQBOgMXS1OcdgoaCwgAA8iJl1QuJfDqk75NtLnOgHVYgTbFakKDDi2OYojuaqNpwjjOCr8oWl/sNx13ESQHhgogRGsRd4GuaZWS2wqXIdTTnWKJiIpCasU4AAA==',
    alt: { ar: 'محرك رينو 16 فالف مفتوح الغطاء يظهر المشعب وأغطية المحرك الأصلية', en: 'A Renault 16V engine with its genuine Renault engine cover and intake manifold' },
    position: '50% 50%',
    sizes: '(min-width: 768px) 33vw, 100vw',
  },
  booking: {
    src: '/images/home/booking.webp',
    width: 1200,
    height: 825,
    blur: 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAACQAQCdASoQAAsAA4BaJZwAAcnTxkAA/umnArkFCIjkyACl0AztddOA/Njw+9orTiuq7AyAne/VLykl/wEkC26fyOAM5eTu0cxWZ8UmpQMIJO/lV4AAAA==',
    alt: { ar: 'رينو ميجان مرفوعة على رافعة داخل ورشة صيانة والغطاء مفتوح', en: 'A Renault Mégane raised on a lift with its hood open in a workshop' },
    position: '50% 62%',
    sizes: '(min-width: 768px) 33vw, 100vw',
  },
  sell: {
    src: '/images/home/sell.webp',
    width: 1200,
    height: 825,
    blur: 'data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAAAQAgCdASoQAAsAA4BaJQBOgBxIW7kEppGgAP5FNI9dMvVFvCiJc2/ekQZ3obHKcrjFP6krbj5L9IraXldTxcAZZ0vmwIkcY2iiLB4B12QAAA==',
    alt: { ar: 'رينو جراند سينيك زرقاء أمام مبنى حديث', en: 'A blue Renault Grand Scénic parked in front of a modern building' },
    position: '50% 55%',
    sizes: '(min-width: 768px) 33vw, 100vw',
  },
  wholesale: {
    src: '/images/home/wholesale.webp',
    width: 1400,
    height: 934,
    blur: 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAADwAQCdASoQAAsAA4BaJQBdgBxtSrv6ZwAA/sFDmUCPJlJSN/HCTzmkeZr+fn54XTiWgZdjfaoC7jXJmfGFlFioB/mt++HUtv8n9GGqaIzbep6uXdXzCM05SAA=',
    alt: { ar: 'مستودع كبير برفوف منظمة مليئة بالبضائع', en: 'A large warehouse with organized shelving full of stock' },
    position: '50% 50%',
    sizes: '(min-width: 1024px) 50vw, 100vw',
  },
};
