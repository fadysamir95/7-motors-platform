import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

/**
 * Parts management (admin): create, update, list, stock adjustments and CSV import, plus who may do what.
 * Stock rules: never negative, never below the units reserved for pending orders.
 */
describe('Catalog administration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = randomUUID().slice(0, 8);
  const PASSWORD = `pw-${randomUUID()}`;
  const emails: string[] = [];
  const skus = (...suffixes: string[]) => suffixes.map((s) => `CA-${run}-${s}`);
  let adminToken: string;
  let customerToken: string;
  let modelA: string;
  let modelB: string;
  let categoryId: string;
  let adminRoleCreated = false;

  const http = () => request(app.getHttpServer());
  const authed = (token: string) => ({ Authorization: `Bearer ${token}` });
  const admin = () => authed(adminToken);

  async function register(label: string) {
    const email = `ca-${run}-${label}@example.test`;
    emails.push(email);
    const res = await http().post('/auth/register').send({ email, password: PASSWORD });
    expect(res.status).toBe(201);
    return { userId: res.body.user.id as string, token: res.body.accessToken as string };
  }

  const valid = (suffix: string, extra: Record<string, unknown> = {}) => ({
    sku: `CA-${run}-${suffix}`,
    price: 250,
    translations: [{ locale: 'ar', name: `قطعة ${suffix}` }, { locale: 'en', name: `Part ${suffix}` }],
    ...extra,
  });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const existing = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const role = existing ?? (await prisma.role.create({ data: { name: 'ADMIN' } }));
    adminRoleCreated = !existing;
    const a = await register('admin');
    await prisma.userRole.create({ data: { userId: a.userId, roleId: role.id } });
    adminToken = a.token;
    customerToken = (await register('customer')).token;
    modelA = (await prisma.vehicleModel.create({ data: { slug: `ca-a-${run}`, name: `Renault CA A ${run}` } })).id;
    modelB = (await prisma.vehicleModel.create({ data: { slug: `ca-b-${run}`, name: `Renault CA B ${run}` } })).id;
    categoryId = (await prisma.productCategory.create({ data: { slug: `ca-cat-${run}` } })).id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { sku: { startsWith: `CA-${run}-` } } });
    await prisma.vehicleModel.deleteMany({ where: { id: { in: [modelA, modelB] } } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }); // written by the audit interceptor for staff writes
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.customerProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    if (adminRoleCreated) await prisma.role.deleteMany({ where: { name: 'ADMIN' } });
    await app.close();
  });

  describe('who may manage the catalog', () => {
    const attempts: Array<[string, (t?: Record<string, string>) => request.Test]> = [
      ['GET /admin/products', (t) => (t ? http().get('/admin/products').set(t) : http().get('/admin/products'))],
      ['POST /products', (t) => (t ? http().post('/products').set(t).send(valid('x')) : http().post('/products').send(valid('x')))],
      ['PATCH /products/:id', (t) => (t ? http().patch(`/products/${randomUUID()}`).set(t).send({ price: 1 }) : http().patch(`/products/${randomUUID()}`).send({ price: 1 }))],
      ['DELETE /products/:id', (t) => (t ? http().delete(`/products/${randomUUID()}`).set(t) : http().delete(`/products/${randomUUID()}`))],
      ['POST /products/import', (t) => (t ? http().post('/products/import').set(t).send({ rows: [{ sku: 'x' }] }) : http().post('/products/import').send({ rows: [{ sku: 'x' }] }))],
      ['POST /inventory/:id/adjust', (t) => (t ? http().post(`/inventory/${randomUUID()}/adjust`).set(t).send({ quantity: 1, type: 'IN' }) : http().post(`/inventory/${randomUUID()}/adjust`).send({ quantity: 1, type: 'IN' }))],
    ];
    it.each(attempts)('%s is 401 anonymous and 403 for a customer', async (_name, call) => {
      expect((await call()).status).toBe(401);
      expect((await call(authed(customerToken))).status).toBe(403);
    });
  });

  describe('create', () => {
    it('creates a part with names, image, compatibility years and opening stock', async () => {
      const res = await http().post('/products').set(admin()).send(
        valid('full', {
          partCode: 'P-1', oemReference: 'OEM-1', brand: 'Valeo', countryOfOrigin: 'France', categoryId,
          images: ['https://example.test/a.jpg', '/images/b.webp'],
          compatibility: [{ modelId: modelA, years: [2015, 2016, 2016, 2018] }, { modelId: modelB, years: [2020] }],
          stock: 12,
        }),
      );
      expect(res.status).toBe(201);
      expect(res.body.inventory.stock).toBe(12);
      expect(res.body.images.map((i: { url: string }) => i.url)).toEqual(['https://example.test/a.jpg', '/images/b.webp']);
      const compA = res.body.compatibility.find((c: { modelId: string }) => c.modelId === modelA);
      expect(compA.years.map((y: { year: number }) => y.year).sort()).toEqual([2015, 2016, 2018]); // duplicates collapsed
      const movements = await prisma.inventoryMovement.findMany({ where: { inventory: { productId: res.body.id } } });
      expect(movements).toHaveLength(1);
      expect(movements[0]).toMatchObject({ type: 'IN', quantity: 12 });
    });

    it('starts with zero stock and no movement when no stock is given', async () => {
      const res = await http().post('/products').set(admin()).send(valid('nostock'));
      expect(res.status).toBe(201);
      expect(res.body.inventory.stock).toBe(0);
      expect(await prisma.inventoryMovement.count({ where: { inventory: { productId: res.body.id } } })).toBe(0);
    });

    it('rejects a duplicate SKU with 409', async () => {
      await http().post('/products').set(admin()).send(valid('dup')).expect(201);
      expect((await http().post('/products').set(admin()).send(valid('dup'))).status).toBe(409);
    });

    it.each([
      ['no translations', { translations: undefined }],
      ['blank names only', { translations: [{ locale: 'en', name: '   ' }] }],
      ['same language twice', { translations: [{ locale: 'en', name: 'A' }, { locale: 'en', name: 'B' }] }],
      ['unknown language', { translations: [{ locale: 'fr', name: 'A' }] }],
      ['negative price', { price: -1 }],
      ['price with 3 decimals', { price: 1.234 }],
      ['text price', { price: 'cheap' }],
      ['negative stock', { stock: -5 }],
      ['non-UUID model', { compatibility: [{ modelId: 'abc', years: [2020] }] }],
      ['unknown model', { compatibility: [{ modelId: randomUUID(), years: [2020] }] }],
      ['year out of range', { compatibility: [{ modelId: 'MODEL_A', years: [1800] }] }],
      ['same model twice', { compatibility: [{ modelId: 'MODEL_A', years: [2020] }, { modelId: 'MODEL_A', years: [2021] }] }],
      ['image that is not a URL', { images: ['javascript:alert(1)'] }],
      ['too many images', { images: Array.from({ length: 11 }, (_, i) => `/i/${i}.jpg`) }],
      ['unknown field', { isAdmin: true }],
    ])('rejects %s with 400 and stores nothing', async (_label, patch) => {
      const body: Record<string, unknown> = JSON.parse(JSON.stringify({ ...valid(`bad-${Math.random().toString(36).slice(2, 7)}`), ...patch }).replace(/MODEL_A/g, modelA));
      if ('translations' in patch && patch.translations === undefined) delete body.translations;
      const before = await prisma.product.count({ where: { sku: { startsWith: `CA-${run}-bad-` } } });
      expect((await http().post('/products').set(admin()).send(body)).status).toBe(400);
      expect(await prisma.product.count({ where: { sku: { startsWith: `CA-${run}-bad-` } } })).toBe(before);
    });
  });

  describe('update', () => {
    let id: string;
    beforeAll(async () => {
      const res = await http().post('/products').set(admin()).send(
        valid('upd', { images: ['/i/1.jpg'], compatibility: [{ modelId: modelA, years: [2015, 2016] }], stock: 3 }),
      );
      id = res.body.id;
    });

    it('changes only the fields that were sent', async () => {
      const res = await http().patch(`/products/${id}`).set(admin()).send({ price: 999.5 });
      expect(res.status).toBe(200);
      expect(Number(res.body.price)).toBe(999.5);
      expect(res.body.translations).toHaveLength(2);
      expect(res.body.images).toHaveLength(1);
      expect(res.body.compatibility).toHaveLength(1);
      expect(res.body.inventory.stock).toBe(3);
    });

    it('replaces images and compatibility when they are sent', async () => {
      const res = await http().patch(`/products/${id}`).set(admin()).send({
        images: ['/i/2.jpg', '/i/3.jpg'],
        compatibility: [{ modelId: modelB, years: [2021, 2022] }],
        translations: [{ locale: 'en', name: 'Renamed' }],
      });
      expect(res.status).toBe(200);
      expect(res.body.images.map((i: { url: string }) => i.url)).toEqual(['/i/2.jpg', '/i/3.jpg']);
      expect(res.body.compatibility.map((c: { modelId: string }) => c.modelId)).toEqual([modelB]);
      expect(res.body.translations.map((t: { name: string }) => t.name)).toEqual(['Renamed']);
    });

    it('does not accept stock here, and answers 404/409/400 for bad updates', async () => {
      expect((await http().patch(`/products/${id}`).set(admin()).send({ stock: 99 })).status).toBe(400);
      expect((await http().patch(`/products/${randomUUID()}`).set(admin()).send({ price: 1 })).status).toBe(404);
      await http().post('/products').set(admin()).send(valid('taken')).expect(201);
      expect((await http().patch(`/products/${id}`).set(admin()).send({ sku: `CA-${run}-taken` })).status).toBe(409);
      expect((await http().patch(`/products/${id}`).set(admin()).send({ translations: [] })).status).toBe(400);
    });

    it('clears optional text fields and the category when they are sent empty or null', async () => {
      await http().patch(`/products/${id}`).set(admin()).send({ partCode: 'P-9', brand: 'Valeo', categoryId }).expect(200);
      const res = await http().patch(`/products/${id}`).set(admin()).send({ partCode: '', brand: '  ', categoryId: null });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ partCode: null, brand: null, categoryId: null });
    });

    it('can unpublish and deactivate a part', async () => {
      const res = await http().patch(`/products/${id}`).set(admin()).send({ isPublished: false, isActive: false });
      expect(res.body).toMatchObject({ isPublished: false, isActive: false });
    });
  });

  describe('admin list', () => {
    beforeAll(async () => {
      await http().post('/products').set(admin()).send(valid('list-live', { stock: 20, categoryId })).expect(201);
      await http().post('/products').set(admin()).send(valid('list-hidden', { isPublished: false, stock: 2 })).expect(201);
      await http().post('/products').set(admin()).send(valid('list-off', { isActive: false, stock: 50 })).expect(201);
    });
    const list = (qs: string) => http().get(`/admin/products?search=CA-${run}-list${qs}`).set(admin());
    const skusOf = (res: request.Response) => res.body.items.map((p: { sku: string }) => p.sku).sort();

    it('shows hidden and inactive parts that the public list hides', async () => {
      expect(skusOf(await list('')).length).toBe(3);
      const pub = await http().get(`/products?search=CA-${run}-list`);
      expect(skusOf(pub)).toEqual(skus('list-live'));
    });

    it('filters by status, low stock and category, and pages with a capped limit', async () => {
      expect(skusOf(await list('&status=active'))).toEqual(skus('list-live'));
      expect(skusOf(await list('&status=unpublished'))).toEqual(skus('list-hidden'));
      expect(skusOf(await list('&status=inactive'))).toEqual(skus('list-off'));
      expect(skusOf(await list('&lowStock=true'))).toEqual(skus('list-hidden'));
      expect(skusOf(await list(`&categoryId=${categoryId}`))).toEqual(skus('list-live'));
      const paged = await list('&limit=2&page=2');
      expect(paged.body).toMatchObject({ total: 3, page: 2, limit: 2, totalPages: 2 });
      expect(paged.body.items).toHaveLength(1);
      expect((await list('&limit=1000')).status).toBe(400);
      expect((await list('&status=weird')).status).toBe(400);
    });

    it('matches by name, SKU and part code', async () => {
      const byName = await http().get('/admin/products?search=Part list-live').set(admin());
      expect(skusOf(byName)).toContain(`CA-${run}-list-live`);
      await http().post('/products').set(admin()).send(valid('code', { partCode: `ZZ-${run}` })).expect(201);
      expect(skusOf(await http().get(`/admin/products?search=ZZ-${run}`).set(admin()))).toEqual(skus('code'));
    });
  });

  describe('stock adjustments', () => {
    let id: string;
    const adjust = (body: Record<string, unknown>) => http().post(`/inventory/${id}/adjust`).set(admin()).send(body);
    beforeAll(async () => {
      id = (await http().post('/products').set(admin()).send(valid('stock', { stock: 10 }))).body.id;
      await prisma.inventory.update({ where: { productId: id }, data: { reserved: 4 } }); // 4 held for pending orders
    });

    it('adds and removes units and records a movement for each change', async () => {
      expect((await adjust({ type: 'IN', quantity: 5, note: 'delivery' })).body.stock).toBe(15);
      expect((await adjust({ type: 'OUT', quantity: 3 })).body.stock).toBe(12);
      expect((await adjust({ type: 'ADJUSTMENT', quantity: -2, note: 'damaged' })).body.stock).toBe(10);
      const moves = await prisma.inventoryMovement.findMany({ where: { inventory: { productId: id } }, orderBy: { createdAt: 'asc' } });
      expect(moves.map((m) => m.type)).toEqual(['IN', 'IN', 'OUT', 'ADJUSTMENT']); // opening stock + the three above
    });

    it('never lets stock go below the reserved units (or below zero)', async () => {
      expect((await adjust({ type: 'OUT', quantity: 7 })).status).toBe(400); // 10 - 7 = 3 < 4 reserved
      expect((await adjust({ type: 'OUT', quantity: 6 })).body.stock).toBe(4); // exactly the reserved units
      expect((await adjust({ type: 'OUT', quantity: 1 })).status).toBe(400);
      expect((await adjust({ type: 'ADJUSTMENT', quantity: -1 })).status).toBe(400);
      expect((await prisma.inventory.findUniqueOrThrow({ where: { productId: id } })).stock).toBe(4);
    });

    it('rejects meaningless quantities and unknown products', async () => {
      expect((await adjust({ type: 'IN', quantity: 0 })).status).toBe(400);
      expect((await adjust({ type: 'OUT', quantity: -3 })).status).toBe(400);
      expect((await adjust({ type: 'ADJUSTMENT', quantity: 0 })).status).toBe(400);
      expect((await adjust({ type: 'IN', quantity: 1.5 })).status).toBe(400);
      expect((await http().post(`/inventory/${randomUUID()}/adjust`).set(admin()).send({ type: 'IN', quantity: 1 })).status).toBe(404);
    });

    it('stays consistent under concurrent removals', async () => {
      const pid = (await http().post('/products').set(admin()).send(valid('race', { stock: 10 }))).body.id;
      const results = await Promise.all(
        Array.from({ length: 15 }, () => http().post(`/inventory/${pid}/adjust`).set(admin()).send({ type: 'OUT', quantity: 1 })),
      );
      expect(results.filter((r) => r.status === 201).length).toBe(10);
      expect(results.filter((r) => r.status === 400).length).toBe(5);
      expect((await prisma.inventory.findUniqueOrThrow({ where: { productId: pid } })).stock).toBe(0);
    });
  });

  describe('delete', () => {
    it('deletes a part, and refuses to delete one that orders refer to', async () => {
      const free = (await http().post('/products').set(admin()).send(valid('del-free'))).body.id;
      expect((await http().delete(`/products/${free}`).set(admin())).status).toBe(200);
      expect(await prisma.product.count({ where: { id: free } })).toBe(0);

      const used = (await http().post('/products').set(admin()).send(valid('del-used', { stock: 5 }))).body.id;
      const order = await prisma.order.create({
        data: {
          orderNumber: `CA-${run}-ORD`, status: 'PENDING_PAYMENT', paymentStatus: 'PENDING', paymentMethod: 'CASH',
          fulfillmentMethod: 'PICKUP', subtotal: 250, tax: 0, shippingFee: 0, total: 250,
          items: { create: [{ productId: used, quantity: 1, unitPrice: 250, subtotal: 250 }] },
        },
      });
      try {
        expect((await http().delete(`/products/${used}`).set(admin())).status).toBe(409);
        expect(await prisma.product.count({ where: { id: used } })).toBe(1);
      } finally {
        await prisma.order.delete({ where: { id: order.id } });
      }
    });
  });

  describe('CSV import', () => {
    const csv = (rows: Record<string, unknown>[], dryRun?: boolean) => http().post('/products/import').set(admin()).send({ rows, dryRun });
    const slugA = () => `ca-a-${run}`;
    const slugB = () => `ca-b-${run}`;

    it('dry run reports what would happen and writes nothing', async () => {
      const res = await csv([{ sku: `CA-${run}-imp1`, nameEn: 'Imported 1', price: '120.5' }, { sku: `CA-${run}-imp2`, price: '5' }], true);
      expect(res.status).toBe(201);
      expect(res.body.dryRun).toBe(true);
      expect(res.body.summary).toEqual({ created: 1, updated: 0, failed: 1 });
      expect(res.body.results[1].errors).toContain('nameAr or nameEn is required for a new product');
      expect(await prisma.product.count({ where: { sku: { startsWith: `CA-${run}-imp` } } })).toBe(0);
    });

    it('creates parts with names, stock, category and model/year compatibility', async () => {
      const res = await csv([{
        sku: `CA-${run}-imp1`, nameAr: 'فلتر', nameEn: 'Filter', price: '120.5', partCode: 'F-1', brand: 'Mann', countryOfOrigin: 'Germany',
        category: `ca-cat-${run}`, stock: '8', models: `${slugA()}|${slugB()}`, yearFrom: '2018', yearTo: '2020',
      }]);
      expect(res.body.summary).toEqual({ created: 1, updated: 0, failed: 0 });
      const p = await prisma.product.findUniqueOrThrow({
        where: { sku: `CA-${run}-imp1` },
        include: { translations: true, inventory: true, compatibility: { include: { years: true } } },
      });
      expect(Number(p.price)).toBe(120.5);
      expect(p.categoryId).toBe(categoryId);
      expect(p.translations.map((t) => t.locale).sort()).toEqual(['ar', 'en']);
      expect(p.inventory?.stock).toBe(8);
      expect(p.compatibility).toHaveLength(2);
      expect(p.compatibility[0].years.map((y) => y.year).sort()).toEqual([2018, 2019, 2020]);
    });

    it('updates an existing SKU: changed fields, stock correction with a movement, untouched fields kept', async () => {
      const res = await csv([{ sku: `CA-${run}-imp1`, nameEn: 'Filter v2', price: '130', stock: '5' }]);
      expect(res.body.summary).toEqual({ created: 0, updated: 1, failed: 0 });
      const p = await prisma.product.findUniqueOrThrow({ where: { sku: `CA-${run}-imp1` }, include: { translations: true, inventory: { include: { movements: true } }, compatibility: true } });
      expect(Number(p.price)).toBe(130);
      expect(p.brand).toBe('Mann'); // not in the row, so unchanged
      expect(p.translations.find((t) => t.locale === 'en')?.name).toBe('Filter v2');
      expect(p.translations.find((t) => t.locale === 'ar')?.name).toBe('فلتر');
      expect(p.compatibility).toHaveLength(2);
      expect(p.inventory?.stock).toBe(5);
      expect(p.inventory?.movements.map((m) => m.type).sort()).toEqual(['ADJUSTMENT', 'IN']);
    });

    it('reports bad rows by number and still applies the good ones', async () => {
      const res = await csv([
        { sku: `CA-${run}-imp3`, nameEn: 'Good', price: '10' },
        { sku: `CA-${run}-imp4`, nameEn: 'Bad price', price: 'free' },
        { sku: `CA-${run}-imp5`, nameEn: 'Bad model', price: '10', models: 'no-such-model' },
        { sku: `CA-${run}-imp6`, nameEn: 'Bad category', price: '10', category: 'nope' },
        { sku: `CA-${run}-imp7`, nameEn: 'Bad years', price: '10', models: slugA(), yearFrom: '2022', yearTo: '2019' },
        { sku: `CA-${run}-imp3`, nameEn: 'Duplicate in file', price: '10' },
        { nameEn: 'No sku', price: '10' },
      ]);
      expect(res.body.summary).toEqual({ created: 1, updated: 0, failed: 6 });
      expect(res.body.results.map((r: { row: number; status: string }) => `${r.row}:${r.status}`)).toEqual(['1:created', '2:error', '3:error', '4:error', '5:error', '6:error', '7:error']);
      expect(res.body.results[2].errors[0]).toContain('unknown model');
      expect(await prisma.product.count({ where: { sku: { in: skus('imp3', 'imp4', 'imp5', 'imp6', 'imp7') } } })).toBe(1);
    });

    it('refuses stock lower than the reserved units for that row only', async () => {
      await prisma.inventory.update({ where: { productId: (await prisma.product.findUniqueOrThrow({ where: { sku: `CA-${run}-imp1` } })).id }, data: { reserved: 3 } });
      const res = await csv([{ sku: `CA-${run}-imp1`, price: '131', stock: '2' }, { sku: `CA-${run}-imp8`, nameEn: 'Fine', price: '1' }]);
      expect(res.body.summary).toEqual({ created: 1, updated: 0, failed: 1 });
      expect(res.body.results[0].errors[0]).toContain('reserved');
      expect(Number((await prisma.product.findUniqueOrThrow({ where: { sku: `CA-${run}-imp1` } })).price)).toBe(130); // that row rolled back
    });

    it('validates the request itself: empty, oversize, non-object rows', async () => {
      expect((await csv([])).status).toBe(400);
      expect((await csv(Array.from({ length: 501 }, (_, i) => ({ sku: `x${i}` })))).status).toBe(400);
      expect((await http().post('/products/import').set(admin()).send({ rows: ['not an object'] })).status).toBe(400);
      expect((await http().post('/products/import').set(admin()).send({ rows: [{}], extra: 1 })).status).toBe(400);
    });
  });
});
