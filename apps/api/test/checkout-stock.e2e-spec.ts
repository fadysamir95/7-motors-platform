import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

/**
 * P0-4 regression tests: checkout must reserve stock atomically. A read-then-write reservation loses updates
 * under concurrency and accepts more orders than there is stock.
 */
describe('Checkout stock reservation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = randomUUID().slice(0, 8);
  const productIds: string[] = [];
  const sessionIds: string[] = [];
  let seq = 0;

  const http = () => request(app.getHttpServer());

  async function newProduct(stock: number) {
    const p = await prisma.product.create({
      data: { sku: `P04-${run}-${seq++}`, price: 100, inventory: { create: { stock } } },
    });
    productIds.push(p.id);
    return p.id;
  }

  /** A guest session whose cart holds the given [productId, quantity] pairs, added in the given order. */
  async function guestCart(label: string, lines: Array<[string, number]>) {
    const sessionId = `p04-${run}-${label}-${seq++}`;
    sessionIds.push(sessionId);
    for (const [productId, quantity] of lines) {
      const res = await http().post(`/cart/items?sessionId=${sessionId}`).send({ productId, quantity });
      expect(res.status).toBe(201);
    }
    return sessionId;
  }

  const checkout = (sessionId: string) =>
    http()
      .post('/orders/checkout')
      .send({ paymentMethod: 'CASH', fulfillmentMethod: 'PICKUP', sessionId, guestName: 'Guest', guestPhone: '01000000000' });

  const inventoryOf = (productId: string) => prisma.inventory.findUniqueOrThrow({ where: { productId } });
  const ordersFor = (productId: string) => prisma.order.count({ where: { items: { some: { productId } } } });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: productIds } } } } });
    await prisma.cartItem.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.cart.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } }); // inventory cascades
    await app.close();
  });

  it('accepts exactly as many concurrent checkouts as there is stock', async () => {
    const productId = await newProduct(3);
    const sessions = await Promise.all(Array.from({ length: 15 }, (_, i) => guestCart(`race${i}`, [[productId, 1]])));

    const results = await Promise.all(sessions.map((s) => checkout(s)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 400)).toHaveLength(12);
    expect(results.filter((r) => r.status >= 500)).toHaveLength(0);
    expect(await ordersFor(productId)).toBe(3);
    expect(await inventoryOf(productId)).toMatchObject({ stock: 3, reserved: 3 });
  });

  it('reserves the exact remaining stock and rejects the next buyer', async () => {
    const productId = await newProduct(2);
    const first = await checkout(await guestCart('exact-a', [[productId, 2]]));
    expect(first.status).toBe(201);
    expect(await inventoryOf(productId)).toMatchObject({ stock: 2, reserved: 2 });

    const second = await checkout(await guestCart('exact-b', [[productId, 1]]));
    expect(second.status).toBe(400);
    expect(await inventoryOf(productId)).toMatchObject({ stock: 2, reserved: 2 });
    expect(await ordersFor(productId)).toBe(1);
  });

  it('rejects a quantity above the available stock without reserving anything', async () => {
    const productId = await newProduct(3);
    const sessionId = await guestCart('over', [[productId, 5]]);

    const res = await checkout(sessionId);

    expect(res.status).toBe(400);
    expect(await inventoryOf(productId)).toMatchObject({ stock: 3, reserved: 0 });
    expect(await ordersFor(productId)).toBe(0);
    const cart = await prisma.cart.findUniqueOrThrow({ where: { sessionId }, include: { items: true } });
    expect(cart.items).toHaveLength(1); // the cart is kept so the buyer can adjust it
  });

  it('rolls back the whole reservation when one line of a multi-item order loses the race', async () => {
    const plentiful = await newProduct(50);
    const scarce = await newProduct(1);
    const sessions = await Promise.all(
      Array.from({ length: 6 }, (_, i) => guestCart(`partial${i}`, [[plentiful, 1], [scarce, 1]])),
    );

    const results = await Promise.all(sessions.map((s) => checkout(s)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status >= 500)).toHaveLength(0);
    // The five losers must not leave a partial reservation on the plentiful product.
    expect(await inventoryOf(plentiful)).toMatchObject({ stock: 50, reserved: 1 });
    expect(await inventoryOf(scarce)).toMatchObject({ stock: 1, reserved: 1 });
    expect(await ordersFor(scarce)).toBe(1);
  });

  it('does not deadlock when concurrent carts hold the same products in opposite order', async () => {
    const a = await newProduct(10);
    const b = await newProduct(10);
    const sessions = await Promise.all(
      Array.from({ length: 10 }, (_, i) => guestCart(`order${i}`, i % 2 ? [[a, 1], [b, 1]] : [[b, 1], [a, 1]])),
    );

    const results = await Promise.all(sessions.map((s) => checkout(s)));

    expect(results.map((r) => r.status)).toEqual(Array(10).fill(201));
    expect(await inventoryOf(a)).toMatchObject({ stock: 10, reserved: 10 });
    expect(await inventoryOf(b)).toMatchObject({ stock: 10, reserved: 10 });
  });

  it('refuses a non-positive cart quantity instead of lowering the reserved count', async () => {
    const productId = await newProduct(5);
    await prisma.inventory.update({ where: { productId }, data: { reserved: 2 } });
    const sessionId = `p04-${run}-neg-${seq++}`;
    sessionIds.push(sessionId);
    const cart = await prisma.cart.create({ data: { sessionId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: -5 } }); // bypasses cart validation on purpose

    const res = await checkout(sessionId);

    expect(res.status).toBe(400);
    expect(await inventoryOf(productId)).toMatchObject({ stock: 5, reserved: 2 });
    expect(await ordersFor(productId)).toBe(0);
  });
});
