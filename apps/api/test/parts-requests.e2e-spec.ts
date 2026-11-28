import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

/** Shoppers can ask for a part that is not in the catalog; the request is stored for staff and the input is validated. */
describe('Parts requests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const createdIds: string[] = [];
  let modelId: string;

  const http = () => request(app.getHttpServer());
  const valid = () => ({ fullName: `Test ${run}`, phone: '01012345678', partName: `Front brake pads ${run}` });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const model = await prisma.vehicleModel.create({ data: { slug: `pr-${run}`, name: `Renault PR ${run}` } });
    modelId = model.id;
  });

  afterAll(async () => {
    await prisma.wholesaleRequest.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.vehicleModel.delete({ where: { id: modelId } }).catch(() => undefined);
    await app.close();
  });

  it('stores a valid request as a PARTS_REQUEST with its item and returns only a reference', async () => {
    const res = await http().post('/wholesale/parts-requests').send({ ...valid(), modelId, quantity: 2, notes: 'year 2016' });
    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
    expect(Object.keys(res.body).sort()).toEqual(['createdAt', 'id', 'status']);
    expect(res.body.status).toBe('NEW');

    const row = await prisma.wholesaleRequest.findUniqueOrThrow({ where: { id: res.body.id }, include: { items: true } });
    expect(row.businessType).toBe('PARTS_REQUEST');
    expect(row.contactPerson).toBe(`Test ${run}`);
    expect(row.phone).toBe('01012345678');
    expect(row.items).toHaveLength(1);
    expect(row.items[0]).toMatchObject({ productName: `Front brake pads ${run}`, modelId, quantity: 2 });
  });

  it('accepts a request without a vehicle and defaults the quantity to 1', async () => {
    const res = await http().post('/wholesale/parts-requests').send(valid());
    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
    const row = await prisma.wholesaleRequest.findUniqueOrThrow({ where: { id: res.body.id }, include: { items: true } });
    expect(row.items[0].quantity).toBe(1);
    expect(row.items[0].modelId).toBeNull();
  });

  it.each([
    ['missing part name', { fullName: 'Ali', phone: '01012345678' }],
    ['part name too short', { ...{ fullName: 'Ali', phone: '01012345678' }, partName: 'x' }],
    ['missing phone', { fullName: 'Ali', partName: 'Oil filter' }],
    ['invalid phone', { fullName: 'Ali', phone: 'call me', partName: 'Oil filter' }],
    ['invalid email', { fullName: 'Ali', phone: '01012345678', partName: 'Oil filter', email: 'nope' }],
    ['quantity out of range', { fullName: 'Ali', phone: '01012345678', partName: 'Oil filter', quantity: 500 }],
    ['non-UUID model id', { fullName: 'Ali', phone: '01012345678', partName: 'Oil filter', modelId: '123' }],
    ['unknown field', { fullName: 'Ali', phone: '01012345678', partName: 'Oil filter', status: 'APPROVED' }],
    ['notes too long', { fullName: 'Ali', phone: '01012345678', partName: 'Oil filter', notes: 'x'.repeat(501) }],
  ])('rejects %s with 400 and stores nothing', async (_label, body) => {
    const before = await prisma.wholesaleRequest.count({ where: { businessType: 'PARTS_REQUEST' } });
    const res = await http().post('/wholesale/parts-requests').send(body);
    expect(res.status).toBe(400);
    expect(await prisma.wholesaleRequest.count({ where: { businessType: 'PARTS_REQUEST' } })).toBe(before);
  });

  it('rejects a well-formed but unknown vehicle model with 400', async () => {
    const res = await http().post('/wholesale/parts-requests').send({ ...valid(), modelId: randomUUID() });
    expect(res.status).toBe(400);
  });

  it('does not let anonymous callers read the requests', async () => {
    const res = await http().get('/wholesale/requests');
    expect(res.status).toBe(401);
  });
});
