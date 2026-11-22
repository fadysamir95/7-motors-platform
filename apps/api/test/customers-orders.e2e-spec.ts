import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { CustomersService } from '../src/customers/customers.service';
import { createTestApp } from './create-test-app';

/**
 * P0-1 regression tests: customer profiles are created at registration, "my orders" only ever returns the
 * caller's own orders, and the admin customerId filter never falls through to an unfiltered query.
 */
describe('Customer profiles and order ownership (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customers: CustomersService;

  const run = randomUUID().slice(0, 8);
  const PASSWORD = `pw-${randomUUID()}`;
  const emails: string[] = [];
  const sessionIds: string[] = [];
  let productId: string;
  let adminRoleCreated = false;

  const http = () => request(app.getHttpServer());
  const newEmail = (label: string) => {
    const email = `p01-${run}-${label}@example.test`;
    emails.push(email);
    return email;
  };
  const authed = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function register(label: string, extra: Record<string, string> = {}) {
    const email = newEmail(label);
    const res = await http().post('/auth/register').send({ email, password: PASSWORD, ...extra });
    expect(res.status).toBe(201);
    return { email, userId: res.body.user.id as string, token: res.body.accessToken as string };
  }

  /** Puts one unit of the test product in the user's cart and checks out. */
  async function placeOrder(token: string) {
    const add = await http().post('/cart/items').set(authed(token)).send({ productId, quantity: 1 });
    expect(add.status).toBe(201);
    const res = await http()
      .post('/orders/checkout')
      .set(authed(token))
      .send({ paymentMethod: 'CASH', fulfillmentMethod: 'PICKUP' });
    expect(res.status).toBe(201);
    return res.body as { id: string; customerId: string | null };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    customers = app.get(CustomersService);

    const product = await prisma.product.create({
      data: { sku: `P01-${run}`, price: 100, inventory: { create: { stock: 100 } } },
    });
    productId = product.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    const profiles = await prisma.customerProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    const profileIds = profiles.map((p) => p.id);

    // Order delete cascades to items, payments and status history.
    await prisma.order.deleteMany({
      where: { OR: [{ customerId: { in: profileIds } }, { items: { some: { productId } } }] },
    });
    await prisma.cartItem.deleteMany({ where: { productId } });
    await prisma.cart.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { sessionId: { in: sessionIds } }] } });
    await prisma.product.deleteMany({ where: { id: productId } }); // inventory cascades
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.customerProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (adminRoleCreated) await prisma.role.deleteMany({ where: { name: 'ADMIN' } });
    await app.close();
  });

  describe('registration creates a CustomerProfile', () => {
    it('builds fullName from first and last name and copies the phone', async () => {
      const { userId } = await register('named', { firstName: 'Mona', lastName: 'Adel', phone: '01011112222' });
      const profile = await prisma.customerProfile.findUnique({ where: { userId } });
      expect(profile).toMatchObject({ fullName: 'Mona Adel', phone: '01011112222' });
    });

    it('falls back to the email local part and an empty phone when no details are given', async () => {
      const { email, userId } = await register('bare');
      const profile = await prisma.customerProfile.findUnique({ where: { userId } });
      expect(profile).toMatchObject({ fullName: email.split('@')[0], phone: '' });
    });

    it('rejects a duplicate email with 409 and creates no second profile', async () => {
      const { email, userId } = await register('dup');
      const again = await http().post('/auth/register').send({ email, password: PASSWORD });
      expect(again.status).toBe(409);
      expect(await prisma.customerProfile.count({ where: { userId } })).toBe(1);
    });
  });

  describe('CustomersService.ensureProfile', () => {
    it('creates a missing profile for a legacy user and is idempotent', async () => {
      const { userId } = await register('legacy', { firstName: 'Old', lastName: 'Timer', phone: '01099998888' });
      // Simulate a user who registered before profiles existed.
      await prisma.customerProfile.delete({ where: { userId } });
      expect(await prisma.customerProfile.count({ where: { userId } })).toBe(0);

      const first = await customers.ensureProfile(userId);
      const second = await customers.ensureProfile(userId);
      expect(second.id).toBe(first.id);
      expect(first).toMatchObject({ fullName: 'Old Timer', phone: '01099998888' });
      expect(await prisma.customerProfile.count({ where: { userId } })).toBe(1);
    });

    it('is race-safe: concurrent calls yield exactly one profile', async () => {
      const { userId } = await register('race');
      await prisma.customerProfile.delete({ where: { userId } });

      const results = await Promise.all(Array.from({ length: 5 }, () => customers.ensureProfile(userId)));
      expect(new Set(results.map((r) => r.id)).size).toBe(1);
      expect(await prisma.customerProfile.count({ where: { userId } })).toBe(1);
    });

    it('throws NotFound for an unknown user', async () => {
      await expect(customers.ensureProfile(randomUUID())).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('GET /orders/me/list', () => {
    it('requires authentication', async () => {
      expect((await http().get('/orders/me/list')).status).toBe(401);
    });

    it('returns an empty list (not an error) for a user without orders, even without a stored profile', async () => {
      const { userId, token } = await register('empty');
      await prisma.customerProfile.delete({ where: { userId } }); // legacy user
      const res = await http().get('/orders/me/list').set(authed(token));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ items: [], total: 0 });
      expect(await prisma.customerProfile.count({ where: { userId } })).toBe(1); // backfilled
    });

    it('links a checkout to the buyer profile and lists it only for that buyer', async () => {
      const alice = await register('alice');
      const bob = await register('bob');
      const aliceProfile = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: alice.userId } });

      const order = await placeOrder(alice.token);
      expect(order.customerId).toBe(aliceProfile.id);

      const aliceList = await http().get('/orders/me/list').set(authed(alice.token));
      expect(aliceList.status).toBe(200);
      expect(aliceList.body.items.map((o: { id: string }) => o.id)).toEqual([order.id]);

      const bobList = await http().get('/orders/me/list').set(authed(bob.token));
      expect(bobList.status).toBe(200);
      expect(bobList.body).toMatchObject({ items: [], total: 0 });
    });

    it('ignores client-supplied filters and cannot be pointed at another account', async () => {
      const carol = await register('carol');
      const dave = await register('dave');
      const carolProfile = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: carol.userId } });
      const order = await placeOrder(carol.token);

      const attempts = [
        `?customerId=${carol.userId}`,
        `?profileId=${carolProfile.id}`,
        `?customerId=${carol.userId}&profileId=${carolProfile.id}&limit=100`,
      ];
      for (const qs of attempts) {
        const res = await http().get(`/orders/me/list${qs}`).set(authed(dave.token));
        expect(res.status).toBe(200);
        expect(res.body.items.map((o: { id: string }) => o.id)).not.toContain(order.id);
        expect(res.body.total).toBe(0);
      }
    });

    it('does not list guest orders (no customer) for any user', async () => {
      const erin = await register('erin');
      const sessionId = `p01-${run}-guest`;
      sessionIds.push(sessionId);
      const add = await http().post(`/cart/items?sessionId=${sessionId}`).send({ productId, quantity: 1 });
      expect(add.status).toBe(201);
      const guest = await http()
        .post('/orders/checkout')
        .send({ paymentMethod: 'CASH', fulfillmentMethod: 'PICKUP', sessionId, guestName: 'Guest', guestPhone: '01000000000' });
      expect(guest.status).toBe(201);
      expect(guest.body.customerId).toBeNull();

      const res = await http().get('/orders/me/list').set(authed(erin.token));
      expect(res.body.items.map((o: { id: string }) => o.id)).not.toContain(guest.body.id);
    });
  });

  describe('GET /orders (admin) customerId filter', () => {
    let adminToken: string;
    let frank: { userId: string; token: string };
    let grace: { userId: string; token: string };
    let frankOrderId: string;
    let graceOrderId: string;

    beforeAll(async () => {
      const existing = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
      const role = existing ?? (await prisma.role.create({ data: { name: 'ADMIN' } }));
      adminRoleCreated = !existing;

      const admin = await register('admin');
      await prisma.userRole.create({ data: { userId: admin.userId, roleId: role.id } });
      adminToken = admin.token; // roles are re-read from the DB on every request

      frank = await register('frank');
      grace = await register('grace');
      frankOrderId = (await placeOrder(frank.token)).id;
      graceOrderId = (await placeOrder(grace.token)).id;
    });

    it('is forbidden for non-admin users', async () => {
      expect((await http().get('/orders').set(authed(frank.token))).status).toBe(403);
      expect((await http().get('/orders')).status).toBe(401);
    });

    it('filters by user id and returns only that customer’s orders', async () => {
      const res = await http().get(`/orders?customerId=${frank.userId}`).set(authed(adminToken));
      expect(res.status).toBe(200);
      const ids = res.body.items.map((o: { id: string }) => o.id);
      expect(ids).toContain(frankOrderId);
      expect(ids).not.toContain(graceOrderId);
      expect(res.body.items.every((o: { customer: { userId: string } }) => o.customer.userId === frank.userId)).toBe(true);
    });

    it('matches nothing for an unknown customerId instead of returning all orders', async () => {
      const res = await http().get(`/orders?customerId=${randomUUID()}`).set(authed(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ items: [], total: 0 });
    });

    it('matches nothing for a user who has no profile', async () => {
      const heidi = await register('heidi');
      await prisma.customerProfile.delete({ where: { userId: heidi.userId } });
      const res = await http().get(`/orders?customerId=${heidi.userId}`).set(authed(adminToken));
      expect(res.body).toMatchObject({ items: [], total: 0 });
    });

    it('without a filter lists orders from multiple customers', async () => {
      const res = await http().get('/orders?limit=100').set(authed(adminToken));
      const ids = res.body.items.map((o: { id: string }) => o.id);
      expect(ids).toEqual(expect.arrayContaining([frankOrderId, graceOrderId]));
    });
  });
});
