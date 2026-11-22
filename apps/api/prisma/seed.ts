import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const roleNames = ['SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'MARKETPLACE_MODERATOR', 'WHOLESALE_MANAGER'] as const;
  for (const name of roleNames) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name, description: name } });
  }

  // Super admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@7motors.com';
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  let generated = false;
  if (!adminPassword) {
    adminPassword = randomBytes(18).toString('base64url');
    generated = true;
  } else if (adminPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters.');
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const admin =
    existingAdmin ??
    (await prisma.user.create({
      data: { email: adminEmail, passwordHash, firstName: 'Super', lastName: 'Admin' },
    }));
  if (!existingAdmin && generated) {
    console.log(`Seeded admin ${adminEmail} with generated password (shown once): ${adminPassword}`);
  } else if (existingAdmin) {
    console.log(`Admin ${adminEmail} already exists; password left unchanged.`);
  }
  const superRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superRole) {
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: admin.id, roleId: superRole.id } }, update: {}, create: { userId: admin.id, roleId: superRole.id } });
  }

  const models = [
    { slug: 'logan', name: 'Renault Logan', img: 'Renault_Logan.JPG' },
    { slug: 'sandero', name: 'Renault Sandero', img: 'Renault_Sandero_1.6_GT_Line_2013_(8366544982).jpg' },
    { slug: 'megane-2', name: 'Renault Megane 2', img: 'Renault_Megane_3_Version_2014.jpg' },
    { slug: 'megane-3', name: 'Renault Megane 3', img: 'Renault_Megane_3_Version_2014.jpg' },
    { slug: 'megane-4', name: 'Renault Megane 4', img: 'Renault_Megane_3_Version_2014.jpg' },
    { slug: 'duster', name: 'Renault Duster', img: 'Renault-Duster.JPG' },
    { slug: 'fluence', name: 'Renault Fluence', img: 'Renault_Fluence.jpg' },
    { slug: 'captur', name: 'Renault Captur', img: 'Renault_Captur.jpg' },
    { slug: 'kadjar', name: 'Renault Kadjar', img: 'Renault_Kadjar.jpg' },
    { slug: 'clio', name: 'Renault Clio', img: 'Renault_Clio.jpg' },
    { slug: 'scenic', name: 'Renault Scenic', img: 'Renault_Scenic.jpg' },
    { slug: 'lodgy', name: 'Renault Lodgy', img: 'Renault_Lodgy.jpg' },
    { slug: 'symbol', name: 'Renault Symbol', img: 'Renault_Symbol.jpg' },
    { slug: 'koleos', name: 'Renault Koleos', img: 'Renault_Koleos.jpg' },
  ];
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(m.img)}`;
    await prisma.vehicleModel.upsert({
      where: { slug: m.slug },
      update: { name: m.name, imageUrl, sortOrder: i, isActive: true },
      create: { slug: m.slug, name: m.name, imageUrl, sortOrder: i, isActive: true },
    });
  }

  // Service types
  const services = [
    { slug: 'periodic-maintenance', ar: 'صيانة دورية', en: 'Periodic Maintenance' },
    { slug: 'parts-installation', ar: 'تركيب قطع غيار', en: 'Spare Parts Installation' },
    { slug: 'suspension-inspection', ar: 'فحص نظام التعليق', en: 'Suspension Inspection' },
    { slug: 'brake-inspection', ar: 'فحص نظام الفرامل', en: 'Brake System Inspection' },
    { slug: 'engine-inspection', ar: 'فحص المحرك', en: 'Engine Inspection' },
    { slug: 'electrical-inspection', ar: 'فحص النظام الكهربائي', en: 'Electrical System Inspection' },
    { slug: 'general-maintenance', ar: 'صيانة عامة', en: 'General Maintenance' },
  ];
  for (let i = 0; i < services.length; i++) {
    const st = await prisma.serviceType.upsert({
      where: { slug: services[i].slug },
      update: {},
      create: { slug: services[i].slug, sortOrder: i, isActive: true },
    });
    await prisma.serviceTypeTranslation.upsert({
      where: { serviceTypeId_locale: { serviceTypeId: st.id, locale: 'ar' } },
      update: {},
      create: { serviceTypeId: st.id, locale: 'ar', name: services[i].ar },
    });
    await prisma.serviceTypeTranslation.upsert({
      where: { serviceTypeId_locale: { serviceTypeId: st.id, locale: 'en' } },
      update: {},
      create: { serviceTypeId: st.id, locale: 'en', name: services[i].en },
    });
  }

  // Business hours Mon-Sat 08-18, Sunday closed
  for (let d = 0; d < 7; d++) {
    await prisma.businessHour.upsert({
      where: { dayOfWeek: d },
      update: {},
      create: { dayOfWeek: d, openTime: '08:00', closeTime: '18:00', isClosed: d === 0 },
    });
  }

  // Categories
  const cats = [
    { slug: 'engine', ar: 'محرك', en: 'Engine' },
    { slug: 'brakes', ar: 'فرامل', en: 'Brakes' },
    { slug: 'suspension', ar: 'تعليق', en: 'Suspension' },
    { slug: 'electrical', ar: 'كهرباء', en: 'Electrical' },
    { slug: 'filters', ar: 'فلاتر', en: 'Filters' },
    { slug: 'body', ar: 'هيكل', en: 'Body' },
  ];
  for (const c of cats) {
    const cat = await prisma.productCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, isActive: true },
    });
    await prisma.productCategoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: cat.id, locale: 'ar' } },
      update: {},
      create: { categoryId: cat.id, locale: 'ar', name: c.ar },
    });
    await prisma.productCategoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: cat.id, locale: 'en' } },
      update: {},
      create: { categoryId: cat.id, locale: 'en', name: c.en },
    });
  }

  console.log('Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
