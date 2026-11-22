# 7 MOTORS Platform

Automotive e-commerce, service booking, and car marketplace platform.

## Stack
- Backend: NestJS, Prisma, PostgreSQL, Redis
- Frontend: Next.js (App Router), Tailwind CSS
- DB: PostgreSQL (Docker)

## Setup

### 1. Start infrastructure
```bash
docker compose -f infra/docker-compose.yml up -d
```
Postgres is exposed on host port 5435 (host port 5432 may be occupied).

### 2. Backend
```bash
cd apps/api
cp .env.example .env  # if present
npm install
npx prisma migrate deploy  # or db push
npx ts-node prisma/seed.ts
npm run start:dev
```
API: http://localhost:3001, Swagger: http://localhost:3001/api/docs

Default admin: admin@7motors.com / Admin@12345

### 3. Frontend
```bash
cd apps/web
npm install
npm run dev
```
Web: http://localhost:3000

## Testing
```bash
cd apps/api
npm run test:e2e
```

## Environments
- Development: .env with local DB
- Staging/Production: set DATABASE_URL, JWT_SECRET, REDIS_URL, FRONTEND_URL

## Backup
Use pg_dump on the Postgres container/volume regularly.
