import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Booking concurrency (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('prevents double booking same slot', async () => {
    const date = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);
    const body = {
      fullName: 'Test User',
      phone: '01000000000',
      licenseNumber: 'ABC123',
      serviceTypeIds: [],
      date,
      startTime: '10:00',
    };
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer()).post('/bookings').send(body),
      request(app.getHttpServer()).post('/bookings').send(body),
    ]);
    const statuses = [r1.status, r2.status].sort();
    // one success (201) and one conflict (409)
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
  });
});
