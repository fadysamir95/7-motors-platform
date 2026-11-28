import { randomUUID } from 'crypto';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import { sign } from 'jsonwebtoken';
import { RoleName } from '@prisma/client';
import request from 'supertest';
import { ROLES_KEY } from '../src/auth/decorators/roles.decorator';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

/**
 * Security regression tests for the staff area: who can reach what, how sessions are issued and checked,
 * rate limiting, what is written to the audit log, and what shoppers can see.
 */

type Route = { key: string; auth: 'public' | 'optional' | 'login' | 'staff'; roles: string[]; usesRolesGuard: boolean };

/** Reads every controller route and how it is protected, straight from the decorators. */
function inventory(app: INestApplication): Route[] {
  const routes: Route[] = [];
  for (const module of app.get(ModulesContainer).values()) {
    for (const wrapper of module.controllers.values()) {
      const ctrl = wrapper.metatype as (new () => object) | null;
      if (!ctrl) continue;
      const base = String(Reflect.getMetadata(PATH_METADATA, ctrl) ?? '').replace(/^\/|\/$/g, '');
      const classGuards: Function[] = Reflect.getMetadata(GUARDS_METADATA, ctrl) ?? [];
      const classRoles: string[] | undefined = Reflect.getMetadata(ROLES_KEY, ctrl);
      for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
        const handler = (ctrl.prototype as Record<string, unknown>)[name];
        if (typeof handler !== 'function' || Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue;
        const sub = String(Reflect.getMetadata(PATH_METADATA, handler) ?? '').replace(/^\/|\/$/g, '');
        const guards = [...classGuards, ...((Reflect.getMetadata(GUARDS_METADATA, handler) as Function[]) ?? [])].map((g) => g.name);
        const roles: string[] = Reflect.getMetadata(ROLES_KEY, handler) ?? classRoles ?? [];
        const usesRolesGuard = guards.includes('RolesGuard');
        const auth: Route['auth'] = guards.includes('JwtAuthGuard')
          ? usesRolesGuard && roles.length ? 'staff' : 'login'
          : guards.includes('OptionalJwtAuthGuard') ? 'optional' : 'public';
        routes.push({ key: `${RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)]} /${[base, sub].filter(Boolean).join('/')}`, auth, roles, usesRolesGuard });
      }
    }
  }
  return routes.sort((a, b) => a.key.localeCompare(b.key));
}

describe('Staff area security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = randomUUID().slice(0, 8);
  const PASSWORD = `pw-${randomUUID()}`;
  const emails: string[] = [];
  const createdRoles: RoleName[] = [];
  let adminToken: string;
  let adminId: string;
  let inventoryToken: string;
  let customerToken: string;
  let customerId: string;
  let modelId: string;

  const http = () => request(app.getHttpServer());
  const authed = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function user(label: string, roleName?: RoleName) {
    const email = `sec-${run}-${label}@example.test`;
    emails.push(email);
    const res = await http().post('/auth/register').send({ email, password: PASSWORD });
    expect(res.status).toBe(201);
    if (roleName) {
      const existing = await prisma.role.findUnique({ where: { name: roleName } });
      const role = existing ?? (await prisma.role.create({ data: { name: roleName } }));
      if (!existing) createdRoles.push(roleName);
      await prisma.userRole.create({ data: { userId: res.body.user.id, roleId: role.id } });
    }
    return { email, id: res.body.user.id as string, token: res.body.accessToken as string };
  }

  const product = (suffix: string, extra: Record<string, unknown> = {}) => ({
    sku: `SEC-${run}-${suffix}`,
    price: 100,
    translations: [{ locale: 'en', name: `Sec part ${suffix}` }],
    ...extra,
  });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const a = await user('admin', 'ADMIN');
    adminToken = a.token;
    adminId = a.id;
    inventoryToken = (await user('inventory', 'INVENTORY_MANAGER')).token;
    const c = await user('customer');
    customerToken = c.token;
    customerId = c.id;
    modelId = (await prisma.vehicleModel.create({ data: { slug: `sec-${run}`, name: `Renault SEC ${run}` } })).id;
  });

  afterAll(async () => {
    process.env.RATE_LIMIT = 'off';
    await prisma.product.deleteMany({ where: { sku: { startsWith: `SEC-${run}-` } } });
    await prisma.vehicleModel.deleteMany({ where: { id: modelId } });
    await prisma.wholesaleRequest.deleteMany({ where: { businessName: { startsWith: `SEC-${run}` } } });
    await prisma.notification.deleteMany({ where: { title: { startsWith: `SEC-${run}` } } });
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    // Failed sign-ins of unknown addresses carry no user id, so they are removed by action (the test database is ours alone).
    await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: ids } }, { action: 'auth.login_failed' }, { action: 'product.delete', metadata: { path: ['snapshot', 'sku'], string_starts_with: `SEC-${run}-` } }] } });
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.customerProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    if (createdRoles.length) await prisma.role.deleteMany({ where: { name: { in: createdRoles } } });
    await app.close();
  });

  describe('every route is protected on purpose', () => {
    it('no route uses RolesGuard without naming a role', () => {
      const bad = inventory(app).filter((r) => r.usesRolesGuard && r.roles.length === 0).map((r) => r.key);
      expect(bad).toEqual([]);
    });

    it('only these writes are open to non-staff (a new open write must be added here on purpose)', () => {
      const open = inventory(app).filter((r) => !r.key.startsWith('GET ') && r.auth !== 'staff').map((r) => `${r.auth} ${r.key}`);
      expect(open).toEqual([
        'optional DELETE /cart',
        'optional DELETE /cart/items/:id',
        'optional PATCH /cart/items/:id',
        'login PATCH /notifications/:id/read',
        'optional POST /bookings',
        'public POST /auth/login',
        'public POST /auth/register',
        'optional POST /cart/items',
        'optional POST /marketplace/listings',
        'optional POST /orders/checkout',
        'public POST /wholesale/parts-requests',
        'public POST /wholesale/requests',
      ].sort((a, b) => a.split(' ').slice(1).join(' ').localeCompare(b.split(' ').slice(1).join(' '))));
    });

    it('only these reads are public or open to any signed-in user; every other read is staff-only', () => {
      const reads = inventory(app).filter((r) => r.key.startsWith('GET ') && r.auth !== 'staff').map((r) => `${r.auth} ${r.key}`).sort();
      expect(reads).toEqual([
        'login GET /auth/me',
        'login GET /notifications',
        'login GET /notifications/unread-count',
        'login GET /orders/me/list',
        'optional GET /cart',
        'public GET /bookings/service-types',
        'public GET /bookings/slots',
        'public GET /categories',
        'public GET /marketplace/listings',
        'public GET /marketplace/listings/:id',
        'public GET /products',
        'public GET /products/:id',
        'public GET /vehicles',
        'public GET /vehicles/:id',
      ]);
    });

    it('rejects a request without a valid token on a sample of staff routes, whatever the verb', async () => {
      for (const [method, path] of [['get', '/admin/products'], ['post', '/products'], ['patch', `/products/${randomUUID()}`], ['delete', `/products/${randomUUID()}`], ['get', '/audit-logs'], ['get', '/settings'], ['put', '/settings/x'], ['get', '/orders'], ['get', '/dashboard/overview']] as const) {
        const anon = await http()[method](path).send({});
        expect([method, path, anon.status]).toEqual([method, path, 401]);
        const cust = await http()[method](path).set(authed(customerToken)).send({});
        expect([method, path, cust.status]).toEqual([method, path, 403]);
      }
    });
  });

  describe('sessions', () => {
    const payload = (id: string) => ({ sub: id, email: 'x@example.test', roles: ['SUPER_ADMIN'] });
    const secret = () => process.env.JWT_SECRET as string;

    it('refuses tokens that are unsigned or signed with another algorithm', async () => {
      const unsigned = sign(payload(adminId), '', { algorithm: 'none' } as never);
      const hs512 = sign(payload(adminId), secret(), { algorithm: 'HS512' });
      const forged = sign(payload(adminId), 'not-the-real-secret', { algorithm: 'HS256' });
      for (const token of [unsigned, hs512, forged]) {
        expect((await http().get('/audit-logs').set(authed(token))).status).toBe(401);
      }
      const good = sign({ sub: adminId }, secret(), { algorithm: 'HS256', expiresIn: '5m' });
      expect((await http().get('/audit-logs').set(authed(good))).status).toBe(200);
    });

    it('takes roles from the database, not from the token: a token that claims SUPER_ADMIN does not make a customer staff', async () => {
      const claim = sign({ sub: customerId, roles: ['SUPER_ADMIN'] }, secret(), { algorithm: 'HS256', expiresIn: '5m' });
      expect((await http().get('/audit-logs').set(authed(claim))).status).toBe(403);
    });

    it('rejects an expired token and a token for a disabled account', async () => {
      const expired = sign({ sub: adminId }, secret(), { algorithm: 'HS256', expiresIn: -10 });
      expect((await http().get('/audit-logs').set(authed(expired))).status).toBe(401);
      const victim = await user('disabled', 'ADMIN');
      await prisma.user.update({ where: { id: victim.id }, data: { isActive: false } });
      expect((await http().get('/audit-logs').set(authed(victim.token))).status).toBe(401);
    });

    it('issues short sessions to staff (12 hours) and longer ones to customers (7 days)', async () => {
      const ttl = async (email: string) => {
        const res = await http().post('/auth/login').send({ email, password: PASSWORD });
        const claims = JSON.parse(Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString());
        return claims.exp - claims.iat;
      };
      expect(await ttl(`sec-${run}-admin@example.test`)).toBe(12 * 3600);
      expect(await ttl(`sec-${run}-customer@example.test`)).toBe(7 * 24 * 3600);
    });

    it.each([
      ['a short password', { password: 'short' }],
      ['a password over 72 bytes (bcrypt would silently cut it)', { password: 'x'.repeat(73) }],
      ['a malformed phone', { phone: 'call me' }],
      ['unknown fields such as roles', { roles: ['SUPER_ADMIN'] }],
      ['a very long name', { firstName: 'x'.repeat(81) }],
    ])('registration refuses %s', async (_label, extra) => {
      const res = await http().post('/auth/register').send({ email: `sec-${run}-reg@example.test`, password: PASSWORD, ...extra });
      expect(res.status).toBe(400);
      expect(await prisma.user.count({ where: { email: `sec-${run}-reg@example.test` } })).toBe(0);
    });

    it('records failed and staff sign-ins in the audit log without storing the e-mail', async () => {
      const attempted = `sec-${run}-admin@example.test`;
      expect((await http().post('/auth/login').send({ email: attempted, password: 'wrong-password' })).status).toBe(401);
      expect((await http().post('/auth/login').send({ email: `nobody-${run}@example.test`, password: 'whatever' })).status).toBe(401);
      await http().post('/auth/login').send({ email: attempted, password: PASSWORD }).expect(201);
      await new Promise((r) => setTimeout(r, 300));
      const failed = await prisma.auditLog.findMany({ where: { action: 'auth.login_failed' }, orderBy: { createdAt: 'desc' }, take: 2 });
      expect(failed).toHaveLength(2);
      expect(JSON.stringify(failed)).not.toContain('@example.test');
      expect(failed[0].metadata).toMatchObject({ emailHash: expect.stringMatching(/^[0-9a-f]{16}$/) });
      expect(await prisma.auditLog.count({ where: { userId: adminId, action: 'auth.login' } })).toBeGreaterThan(0);
    });
  });

  describe('changes by staff leave a trail', () => {
    it('records who wrote what (field names only) and who probed a staff route', async () => {
      const created = await http().post('/products').set(authed(adminToken)).send(product('audit', { price: 987.65 }));
      expect(created.status).toBe(201);
      await http().patch(`/products/${created.body.id}`).set(authed(adminToken)).send({ price: 55 }).expect(200);
      await http().post('/products').set(authed(customerToken)).send(product('probe')).expect(403);
      await new Promise((r) => setTimeout(r, 300));

      const mine = await prisma.auditLog.findMany({ where: { userId: adminId, entityType: 'Catalog' }, orderBy: { createdAt: 'asc' } });
      expect(mine.map((l) => l.action)).toEqual(expect.arrayContaining(['POST /products', 'PATCH /products/:id']));
      const patch = mine.find((l) => l.action === 'PATCH /products/:id')!;
      expect(patch.entityId).toBe(created.body.id);
      expect(patch.metadata).toMatchObject({ outcome: 'ok', bodyFields: ['price'] });
      expect(JSON.stringify(mine)).not.toContain('987.65'); // values are never stored

      const probe = await prisma.auditLog.findFirst({ where: { userId: customerId, action: 'POST /products' } });
      expect(probe?.metadata).toMatchObject({ outcome: 'denied' });
    });

    it('does not log reads', async () => {
      const before = await prisma.auditLog.count({ where: { userId: adminId, action: 'GET /admin/products' } });
      await http().get('/admin/products').set(authed(adminToken)).expect(200);
      expect(await prisma.auditLog.count({ where: { userId: adminId, action: 'GET /admin/products' } })).toBe(before);
    });
  });

  describe('deleting parts', () => {
    it('is for administrators only, and keeps a full copy of the part in the audit log', async () => {
      const made = await http().post('/products').set(authed(inventoryToken)).send(product('del', { stock: 4, compatibility: [{ modelId, years: [2020] }], images: ['/i/a.jpg'] }));
      expect(made.status).toBe(201); // inventory managers can add parts
      const id = made.body.id as string;

      expect((await http().delete(`/products/${id}`).set(authed(inventoryToken))).status).toBe(403);
      expect(await prisma.product.count({ where: { id } })).toBe(1);

      expect((await http().delete(`/products/${id}`).set(authed(adminToken))).status).toBe(200);
      expect(await prisma.product.count({ where: { id } })).toBe(0);
      const entry = await prisma.auditLog.findFirst({ where: { action: 'product.delete', entityId: id } });
      expect(entry?.userId).toBe(adminId);
      const snap = (entry?.metadata as { snapshot: { sku: string; price: string; inventory: { stock: number }; compatibility: unknown[]; images: { url: string }[] } }).snapshot;
      expect(snap).toMatchObject({ sku: `SEC-${run}-del`, inventory: { stock: 4 } });
      expect(snap.compatibility).toHaveLength(1);
      expect(snap.images[0].url).toBe('/i/a.jpg');
    });
  });

  describe('what shoppers can see', () => {
    it('hides parts that are inactive or unpublished, but staff can still open them', async () => {
      const off = (await http().post('/products').set(authed(adminToken)).send(product('off', { isActive: false }))).body.id;
      const hidden = (await http().post('/products').set(authed(adminToken)).send(product('hidden', { isPublished: false }))).body.id;
      const live = (await http().post('/products').set(authed(adminToken)).send(product('live'))).body.id;
      expect((await http().get(`/products/${off}`)).status).toBe(404);
      expect((await http().get(`/products/${hidden}`)).status).toBe(404);
      expect((await http().get(`/products/${live}`)).status).toBe(200);
      expect((await http().get(`/admin/products/${off}`).set(authed(adminToken))).status).toBe(200);
      expect((await http().get(`/admin/products/${hidden}`).set(authed(customerToken))).status).toBe(403);
    });

    it('caps page size and refuses odd sorting or unknown query fields', async () => {
      expect((await http().get('/products?limit=100')).status).toBe(200);
      expect((await http().get('/products?limit=101')).status).toBe(400);
      expect((await http().get('/products?limit=0')).status).toBe(400);
      expect((await http().get('/products?sortBy=passwordHash')).status).toBe(400);
      expect((await http().get('/products?sortBy=price&sortOrder=asc')).status).toBe(200);
      expect((await http().get('/products?isActive=false')).status).toBe(400);
      expect((await http().get(`/products?search=${'x'.repeat(101)}`)).status).toBe(400);
      expect((await http().get('/products?modelId=not-a-uuid')).status).toBe(400);
    });

    it('accepts only http(s) or single-slash image links', async () => {
      for (const bad of ['//evil.example/x.png', 'javascript:alert(1)', 'data:text/html;base64,AAAA', 'ftp://x/y.png']) {
        const res = await http().post('/products').set(authed(adminToken)).send(product(`img-${Math.random().toString(36).slice(2, 6)}`, { images: [bad] }));
        expect([bad, res.status]).toEqual([bad, 400]);
      }
    });
  });

  describe('notifications (staff broadcasts are not for customers)', () => {
    let broadcastId: string;
    let ownId: string;
    beforeAll(async () => {
      broadcastId = (await prisma.notification.create({ data: { type: 'BOOKING_CREATED', title: `SEC-${run} broadcast`, body: 'Ahmed - 01000000000', userId: null } })).id;
      ownId = (await prisma.notification.create({ data: { type: 'BOOKING_CREATED', title: `SEC-${run} own`, body: 'yours', userId: customerId } })).id;
    });
    const titles = (res: request.Response) => res.body.map((n: { title: string }) => n.title).filter((t: string) => t.startsWith(`SEC-${run}`)).sort();

    it('customers see only their own; staff also see broadcasts', async () => {
      expect(titles(await http().get('/notifications').set(authed(customerToken)))).toEqual([`SEC-${run} own`]);
      expect(titles(await http().get('/notifications').set(authed(adminToken)))).toEqual([`SEC-${run} broadcast`]);
      const count = (token: string) => http().get('/notifications/unread-count').set(authed(token));
      expect(Number((await count(customerToken)).text)).toBe(1);
      expect(Number((await count(adminToken)).text)).toBeGreaterThanOrEqual(1);
    });

    it('lets people mark only what they can see', async () => {
      expect((await http().patch(`/notifications/${broadcastId}/read`).set(authed(customerToken))).status).toBe(404);
      expect((await prisma.notification.findUniqueOrThrow({ where: { id: broadcastId } })).isRead).toBe(false);
      expect((await http().patch(`/notifications/${ownId}/read`).set(authed(inventoryToken))).status).toBe(404);
      expect((await http().patch(`/notifications/${ownId}/read`).set(authed(customerToken))).status).toBe(200);
      expect((await http().patch(`/notifications/${broadcastId}/read`).set(authed(adminToken))).status).toBe(200);
    });
  });

  describe('public wholesale form', () => {
    const form = (extra: Record<string, unknown> = {}) => ({
      businessName: `SEC-${run} Garage`, contactPerson: 'Omar', phone: '01012345678', items: [{ productName: 'Brake pads', quantity: 2 }], ...extra,
    });

    it('accepts the web form (blank optional fields included) and stores it as NEW', async () => {
      const res = await http().post('/wholesale/requests').send(form({ whatsapp: '', email: '', city: '', businessType: '', notes: '', items: [{ productName: 'Brake pads', partCode: '', quantity: 2 }] }));
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('NEW');
    });

    it.each([
      ['no items', { items: [] }],
      ['too many items', { items: Array.from({ length: 51 }, () => ({ productName: 'x', quantity: 1 })) }],
      ['a bad phone', { phone: 'call me' }],
      ['a negative quantity', { items: [{ productName: 'x', quantity: -1 }] }],
      ['an absurd quantity', { items: [{ productName: 'x', quantity: 10 ** 9 }] }],
      ['a status of the caller\'s choosing', { status: 'APPROVED' }],
      ['a huge note', { notes: 'x'.repeat(1001) }],
      ['a non-UUID model', { items: [{ productName: 'x', quantity: 1, modelId: 'abc' }] }],
    ])('refuses %s', async (_label, extra) => {
      expect((await http().post('/wholesale/requests').send(form(extra))).status).toBe(400);
    });

    it('validates what staff send when moving a request along', async () => {
      const id = (await http().post('/wholesale/requests').send(form())).body.id as string;
      const patch = (body: Record<string, unknown>) => http().patch(`/wholesale/requests/${id}/status`).set(authed(adminToken)).send(body);
      expect((await patch({ status: 'DELETE_EVERYTHING' })).status).toBe(400);
      expect((await patch({ status: 'CONTACTED', note: 'x'.repeat(2001) })).status).toBe(400);
      expect((await patch({ status: 'CONTACTED', note: 'called' })).status).toBe(200);
    });
  });

  describe('rate limiting', () => {
    beforeAll(() => { process.env.RATE_LIMIT = 'on'; });
    afterAll(() => { process.env.RATE_LIMIT = 'off'; });

    it('slows password guessing: the 11th sign-in attempt in a minute is refused', async () => {
      const codes: number[] = [];
      for (let i = 0; i < 12; i++) codes.push((await http().post('/auth/login').send({ email: `guess-${run}@example.test`, password: `attempt-${i}` })).status);
      expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
      expect(codes.slice(10)).toEqual([429, 429]);
    });

    it('limits the public forms: the 6th parts request in ten minutes is refused', async () => {
      const send = () => http().post('/wholesale/parts-requests').send({ fullName: 'Rate Test', phone: '01012345678', partName: 'Oil filter' });
      const codes: number[] = [];
      for (let i = 0; i < 7; i++) codes.push((await send()).status);
      expect(codes.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
      expect(codes.slice(5)).toEqual([429, 429]);
      await prisma.wholesaleRequest.deleteMany({ where: { contactPerson: 'Rate Test' } });
    });

    it('answers 429 with a Retry-After header', async () => {
      const res = await http().post('/auth/login').send({ email: `guess2-${run}@example.test`, password: 'x' });
      expect(res.status).toBe(429); // the same address already used up its sign-in allowance above
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });
  });
});
