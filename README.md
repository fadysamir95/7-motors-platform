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
cp .env.example .env
# Set a real JWT_SECRET (min 32 chars; the API refuses to boot otherwise):
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Install dependencies once from the repo root (npm workspaces): npm install
npx prisma migrate deploy  # or db push
npx ts-node prisma/seed.ts
npm run start:dev
```
API: http://localhost:3001, Swagger: http://localhost:3001/api/docs

Admin user: set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (min 12 chars) in `.env` before seeding.
If SEED_ADMIN_PASSWORD is empty, a random password is generated and printed once.

### 3. Frontend
```bash
cd apps/web
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
