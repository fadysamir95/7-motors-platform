import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// A unique far-future date per run so reruns never collide.
function randomFutureDate(): string {
  const d = new Date(Date.UTC(2100, 0, 1));
  d.setUTCDate(d.getUTCDate() + Math.floor(Math.random() * 3000));
  return d.toISOString().slice(0, 10);
}

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const dates: string[] = [];

  const newDate = () => {
    const d = randomFutureDate();
    dates.push(d);
    return d;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const where = { date: { in: dates.map((d) => new Date(d)) } };
    await prisma.serviceBooking.deleteMany({ where });
    await prisma.bookingSlot.deleteMany({ where });
    await app.close();
  });

  const bookingBody = (date: string) => ({
    fullName: 'Test User',
    phone: '01000000000',
    licenseNumber: 'ABC123',
    serviceTypeIds: [],
    date,
    startTime: '10:00',
  });

  describe('GET /bookings/slots', () => {
    it('is routed and returns the slot list', async () => {
      const res = await request(app.getHttpServer()).get(`/bookings/slots?date=${newDate()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      expect(res.body[0]).toEqual({ startTime: '08:00', endTime: '09:00', available: true });
    });

    it('rejects a missing or malformed date with 400', async () => {
      expect((await request(app.getHttpServer()).get('/bookings/slots')).status).toBe(400);
      expect((await request(app.getHttpServer()).get('/bookings/slots?date=tomorrow')).status).toBe(400);
      expect((await request(app.getHttpServer()).get('/bookings/slots?date=2100-13-45')).status).toBe(400);
    });

    it('marks a booked slot as unavailable', async () => {
      const date = newDate();
      const created = await request(app.getHttpServer()).post('/bookings').send(bookingBody(date));
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer()).get(`/bookings/slots?date=${date}`);
      const ten = res.body.find((s: { startTime: string }) => s.startTime === '10:00');
      expect(ten.available).toBe(false);
      expect(res.body.find((s: { startTime: string }) => s.startTime === '11:00').available).toBe(true);
    });
  });

  it('prevents double booking of the same slot', async () => {
    const body = bookingBody(newDate());
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer()).post('/bookings').send(body),
      request(app.getHttpServer()).post('/bookings').send(body),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
  });
});
