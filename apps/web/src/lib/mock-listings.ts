/**
 * SAMPLE DATA: development preview only.
 *
 * These listings are fictional and exist so the "Cars for Sale" cards can be reviewed before real
 * marketplace listings are published. They are shown only when `NODE_ENV === 'development'` and the
 * real API returned nothing (see components/home/FeaturedCars.tsx). They are never rendered in a
 * production build, and this file is not bundled there.
 *
 * To switch to real data: nothing to change. Published listings from `GET /marketplace/listings`
 * take precedence automatically. To hide the samples in development too, set
 * `NEXT_PUBLIC_USE_MOCK_LISTINGS=false` in apps/web/.env.local.
 *
 * Shape matches the API response, so the same card renders both.
 */
export type ListingCard = {
  id: string;
  year: number;
  price: string | number;
  mileage: number;
  transmission?: string;
  fuelType?: string;
  model?: { name?: string } | null;
  images?: { url: string; blur?: string }[];
};

export const mockListings: ListingCard[] = [
  {
    id: 'sample-1',
    year: 2019,
    price: 620000,
    mileage: 86000,
    transmission: 'Manual',
    fuelType: 'Petrol',
    model: { name: 'Renault Duster' },
    images: [{ url: '/images/home/cars/car-1.webp', blur: 'data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADwAQCdASoQAAkAA4BaJZwAD4lvqfKKmwAA/O7RnKGhLMk6wVAQxHmo7KV2axpfYq+Dc2h/Q9xCXV/ZSqi4LxT9V7e+cTMigAA=' }],
  },
  {
    id: 'sample-2',
    year: 2010,
    price: 385000,
    mileage: 112000,
    transmission: 'Manual',
    fuelType: 'Petrol',
    model: { name: 'Renault Clio RS 200' },
    images: [{ url: '/images/home/cars/car-2.webp', blur: 'data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAAAQAgCdASoQAAkAA4BaJYwCdAEPR15Zb9UAAP7XP86ffEK6BfevvD/ZLUa4/65ii/YEDoyO9hxvjQdseFnXCyXQ/GZhTgiHBIjvZB+gvVLEAA==' }],
  },
  {
    id: 'sample-3',
    year: 2020,
    price: 720000,
    mileage: 38000,
    transmission: 'Manual',
    fuelType: 'Petrol',
    model: { name: 'Renault Sandero R.S.' },
    images: [{ url: '/images/home/cars/car-3.webp', blur: 'data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADQAQCdASoQAAsAA4BaJYwCdAD5i8+gAAD2RD5ghZ2F7NvjozIPPjvy7iGIVz8NmkYuwWcJntz0ApnjyvlSEh5M9FkJoGGAAAA=' }],
  },
  {
    id: 'sample-4',
    year: 2018,
    price: 690000,
    mileage: 64000,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    model: { name: 'Renault Captur' },
    images: [{ url: '/images/home/cars/car-4.webp', blur: 'data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAAAQAgCdASoQAAgAA4BaJQAB8OYHj8IrVfYAAP64M1ntZEhg5Oe8WXprFYAZcYc3GimfeZ2B4BJnGvbWsk448iBovyg6nKG7HcKR/nw+ztaiDu8XDtlUAAAA' }],
  },
];
