/**
 * DEVELOPMENT ONLY: inserts clearly labelled sample spare parts and links them to vehicle models, so the
 * "choose a car -> see its parts" flow can be reviewed before the real catalog is loaded.
 *
 * - Insert-only and idempotent: products are keyed by SKU ("SAMPLE-..."), existing ones are left untouched.
 * - Every name carries "(عينة)" / "(sample)" so nobody mistakes these for real catalog data.
 * - Remove them any time with:  DELETE FROM "Product" WHERE sku LIKE 'SAMPLE-%';  (translations, images,
 *   compatibility and inventory rows cascade).
 *
 * Run: cd apps/api && npx ts-node prisma/seed-sample-parts.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL = ['logan', 'sandero', 'megane', 'megane-2', 'megane-3', 'megane-4', 'duster', 'fluence', 'captur', 'kadjar', 'clio', 'scenic', 'symbol', 'koleos', 'lodgy'];
const SMALL = ['logan', 'sandero', 'symbol', 'clio', 'lodgy'];
const MEGANE = ['megane', 'megane-2', 'megane-3', 'megane-4', 'fluence', 'scenic'];
const SUV = ['duster', 'captur', 'kadjar', 'koleos'];

type Sample = { sku: string; category: string; ar: string; en: string; price: number; stock: number; origin: string; models: string[]; from?: number; to?: number };

const SAMPLES: Sample[] = [
  { sku: 'SAMPLE-FLT-OIL', category: 'filters', ar: 'فلتر زيت محرك', en: 'Engine oil filter', price: 180, stock: 40, origin: 'Turkey', models: ALL },
  { sku: 'SAMPLE-FLT-AIR', category: 'filters', ar: 'فلتر هواء', en: 'Air filter', price: 220, stock: 28, origin: 'Turkey', models: ALL },
  { sku: 'SAMPLE-FLT-CAB', category: 'filters', ar: 'فلتر مكيف (كابينة)', en: 'Cabin air filter', price: 260, stock: 22, origin: 'France', models: [...MEGANE, ...SUV] },
  { sku: 'SAMPLE-BRK-PAD-F', category: 'brakes', ar: 'طقم تيل فرامل أمامي', en: 'Front brake pad set', price: 950, stock: 15, origin: 'France', models: [...SMALL, ...SUV] },
  { sku: 'SAMPLE-BRK-PAD-R', category: 'brakes', ar: 'طقم تيل فرامل خلفي', en: 'Rear brake pad set', price: 780, stock: 0, origin: 'France', models: MEGANE },
  { sku: 'SAMPLE-BRK-DSC-F', category: 'brakes', ar: 'أسطوانات فرامل أمامية (زوج)', en: 'Front brake discs (pair)', price: 2100, stock: 9, origin: 'Germany', models: [...MEGANE, ...SUV] },
  { sku: 'SAMPLE-ENG-SPK', category: 'engine', ar: 'طقم بوجيهات (4 قطع)', en: 'Spark plug set (4)', price: 640, stock: 33, origin: 'Japan', models: ALL },
  { sku: 'SAMPLE-ENG-BELT', category: 'engine', ar: 'طقم سير كاتينة', en: 'Timing belt kit', price: 2850, stock: 6, origin: 'Germany', models: [...SMALL, ...MEGANE, 'duster'] },
  { sku: 'SAMPLE-ENG-WP', category: 'engine', ar: 'طلمبة مياه', en: 'Water pump', price: 1450, stock: 11, origin: 'Italy', models: [...SMALL, ...MEGANE] },
  { sku: 'SAMPLE-SUS-SHK-F', category: 'suspension', ar: 'مساعد أمامي (قطعة)', en: 'Front shock absorber', price: 1750, stock: 8, origin: 'Spain', models: [...SMALL, ...SUV] },
  { sku: 'SAMPLE-SUS-ARM', category: 'suspension', ar: 'مقص أمامي', en: 'Front control arm', price: 1900, stock: 5, origin: 'Turkey', models: [...MEGANE, 'clio'] },
  { sku: 'SAMPLE-ELC-BAT', category: 'electrical', ar: 'بطارية 60 أمبير', en: 'Battery 60Ah', price: 2400, stock: 14, origin: 'Egypt', models: ALL },
  { sku: 'SAMPLE-ELC-ALT', category: 'electrical', ar: 'دينامو شحن', en: 'Alternator', price: 4200, stock: 3, origin: 'France', models: [...SMALL, ...SUV] },
  { sku: 'SAMPLE-BDY-WPR', category: 'body', ar: 'طقم مساحات زجاج', en: 'Wiper blade set', price: 320, stock: 30, origin: 'Germany', models: ALL },
  { sku: 'SAMPLE-BDY-MIR', category: 'body', ar: 'مرآة جانبية يمين', en: 'Right side mirror', price: 1250, stock: 4, origin: 'Turkey', models: SMALL },
];

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Sample parts must never be seeded in production.');

  const models = await prisma.vehicleModel.findMany({ select: { id: true, slug: true } });
  const modelId = new Map(models.map((m) => [m.slug, m.id]));
  const categories = await prisma.productCategory.findMany({ select: { id: true, slug: true } });
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  let created = 0;
  for (const s of SAMPLES) {
    if (await prisma.product.findUnique({ where: { sku: s.sku }, select: { id: true } })) continue;
    const catId = categoryId.get(s.category);
    const links = s.models.map((slug) => modelId.get(slug)).filter((id): id is string => Boolean(id));
    const years = Array.from({ length: (s.to ?? 2025) - (s.from ?? 2010) + 1 }, (_, i) => (s.from ?? 2010) + i);
    await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          sku: s.sku,
          partCode: s.sku.replace('SAMPLE-', 'SMP-'),
          categoryId: catId,
          countryOfOrigin: s.origin,
          price: s.price,
          translations: { create: [{ locale: 'ar', name: `${s.ar} (عينة)` }, { locale: 'en', name: `${s.en} (sample)` }] },
          inventory: { create: { stock: s.stock } },
        },
      });
      for (const mid of links) {
        const c = await tx.productVehicleCompatibility.create({ data: { productId: p.id, modelId: mid } });
        await tx.productCompatibilityYear.createMany({ data: years.map((year) => ({ compatibilityId: c.id, year })) });
      }
    });
    created++;
  }
  console.log(`Sample parts: ${created} created, ${SAMPLES.length - created} already present.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
