# CLAUDE.md — 7 MOTORS Platform

Read this file fully before doing any work in this repository. It describes what is **actually implemented**, what is **known broken**, and what is only **recommended**. The three are kept separate on purpose.

## Rules for every Claude session
1. Read this file before starting work.
2. Read the modules you will touch (controller, service, DTOs, module, Prisma models, tests) before editing.
3. Search for an existing implementation or helper before writing a new one.
4. Follow the existing architecture. Any architectural change needs explicit user approval first.
5. No unrelated refactoring, renames or "cleanup" in the same change.
6. Write or update tests for every behavioral change (see Testing).
7. Run the validation commands that apply (see Commands) before reporting done.
8. Finish every task with: modified files, test results (real output, including failures), remaining risks.
9. Ask for approval before anything destructive or high-risk: deleting or overwriting data, migrations, dependency changes, `.env` edits, force-pushes, resetting the DB.
10. Work one issue at a time and stop for review when the user asks for gated work.
11. Never print or commit secrets. Treat `.env` and `.env.local` as private; do not read them out loud or edit them without approval.

## 1. Project overview
7 MOTORS is a Renault-focused automotive platform for the Egyptian market (Arabic-first, RTL). Business domains:
1. Spare-parts e-commerce (catalog, cart, checkout, orders).
2. Service/maintenance booking (hourly slots).
3. Vehicle and part-compatibility management.
4. Inventory and order management.
5. Wholesale (B2B) requests and quotations.
6. Car marketplace (user listings with moderation).
7. Admin dashboard with role-based access.

### Stack (from package.json files)
| Area | Technology |
|---|---|
| Monorepo | npm workspaces (`apps/*`, `packages/*`); `packages/` is empty |
| API | NestJS 11, Prisma 6.19, PostgreSQL 16, Passport-JWT, class-validator, Swagger (`/api/docs`), helmet, compression |
| Web | Next.js 16.4 (App Router), React 19.3, Tailwind CSS 4.3, TypeScript strict |
| Infra | Docker Compose: `postgres:16-alpine` (host port **5435**), `redis:7-alpine` (6379) |
| Tests | Jest 30 + ts-jest, supertest |
| Runtime | Node 22, npm 10 |

`apps/web/AGENTS.md` warns that this Next.js version has breaking changes. Read `node_modules/next/dist/docs/` before writing Next-specific code.

### Layout
```
apps/api/   NestJS API (src/<module>/, prisma/schema.prisma, prisma/seed.ts, prisma/migrations, test/)
apps/web/   Next.js app (src/app routes, src/components/{ui,home}, src/lib/{api.ts,i18n.ts})
infra/      docker-compose.yml
packages/   empty
```

## 2. Architecture (as implemented)

### Backend: modular monolith (no microservices)
Modules in `apps/api/src/`: `auth`, `customers`, `vehicles`, `catalog`, `inventory`, `cart`, `orders`, `bookings`, `marketplace`, `wholesale`, `dashboard`, `audit`, `settings`, `notifications`, `prisma`, `config`. Each follows `<name>.module.ts` / `.controller.ts` / `.service.ts` / `dto/`. `PrismaModule` exports `PrismaService`. `AppModule` loads `ConfigModule` globally with env validation.

- **Auth:** email+password, bcrypt, JWT (7-day, no refresh or revocation). `JwtStrategy.validate` re-reads the user and roles from the DB on every request. Guards: `JwtAuthGuard` (required), `OptionalJwtAuthGuard` (anonymous allowed, **swallows all errors including expired tokens**), `RolesGuard` + `@Roles(...)`. Guards are **opt-in per route, not global**: a new controller route is public unless it declares guards.
- **Roles (enum `RoleName`):** SUPER_ADMIN, ADMIN, SERVICE_MANAGER, INVENTORY_MANAGER, ORDER_MANAGER, MARKETPLACE_MODERATOR, WHOLESALE_MANAGER. Role lists are hardcoded per route. The `Permission`/`RolePermission` tables exist but are **unused**.
- **Config:** `src/config/env.validation.ts` refuses to boot unless `JWT_SECRET` is set, at least 32 chars and not a placeholder. Required env: `DATABASE_URL`, `JWT_SECRET`; also `PORT`, `FRONTEND_URL`, `REDIS_URL`. See `apps/api/.env.example`.
- **Bootstrap (`main.ts`):** helmet, compression, CORS limited to `FRONTEND_URL`, global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, Swagger.
- **Redis, BullMQ, ioredis, @nestjs/throttler** are installed/running but **not used by any code**.

### Data model (Prisma, ~40 models, one migration `init`)
Users/Roles/Permissions · `CustomerProfile` · `VehicleModel → VehicleGeneration → VehicleVariant (EngineType)` · `ProductCategory` (tree) · `Product` + `ProductTranslation` (ar/en) + `ProductImage` + `ProductVehicleCompatibility` (per model, with `ProductCompatibilityYear` per year/variant) · `Inventory` (stock, reserved) + `InventoryMovement` · `Cart/CartItem` (userId or sessionId) · `Order/OrderItem/Payment/PaymentTransaction/Shipment/OrderStatusHistory` · `ServiceType(+translations)/BusinessHour/BookingSlot/BlockedSlot/ServiceBooking/BookingService/BookingStatusHistory` · `CarListing/CarListingImage/CarListingStatusHistory` · `WholesaleRequest/Item/Quotation/Note` · `Notification/NotificationPreference` · `AuditLog` · `SystemSetting`. Money is `Decimal(12,2)`. Localized text lives in `*Translation` tables with `Locale` enum (`ar`, `en`).

### Frontend
Next.js App Router, flat routes: `/`, `/vehicles(/[id])`, `/cart`, `/checkout`, `/orders/success/[id]`, `/booking`, `/marketplace(/[id], /new)`, `/wholesale`, `/login`, `/admin/*` (products, orders, bookings, listings, wholesale, vehicles, notifications). Almost every page is `'use client'` and fetches via `src/lib/api.ts` (`apiGet/apiPost/apiPatch/apiDelete`, base `NEXT_PUBLIC_API_URL`, token from `localStorage('token')` sent as Bearer). State is local `useState` plus `LocaleProvider`. There is no admin layout or client-side route guard.

### Localization / RTL
`src/lib/i18n.ts` holds the ar/en dictionary; `LocaleProvider` exposes `useLocale()` → `{ locale, t, dir, setLocale }`, persists to `localStorage('locale')`, and sets `document.documentElement.lang/dir`. Default is Arabic/RTL (`<html lang="ar" dir="rtl">`). Backend returns translation arrays; the UI picks by locale with fallback.

### Guest identity
Guests are identified by a client-chosen `sessionId` (query string or `x-session-id` header) for carts and checkout. This is a known weakness (see Known issues).

## 3. Status: implemented vs. known issues vs. recommendations

### Fixed in the current working tree (uncommitted; verify with `git status` / `git log`)
- **P0-8 done:** no JWT fallback secret; boot-time validation; seed admin password comes from env or is generated; login form no longer prefilled.
- **P0-3 done:** `GET /bookings/slots` exists, validated (`YYYY-MM-DD`), UTC-based; covered by e2e tests.
- **P0-1 in progress, not yet tested:** register now creates a `CustomerProfile`; `CustomersService.ensureProfile(userId)` added; `/orders/me/list` now uses `OrdersService.listMine`; admin `customerId` filter no longer falls through to "all orders". Code compiles, but **tests for P0-1 are not written yet**.

### Known open issues (from the audit; do not assume they are fixed)
- **P0-2** Notifications: `userId = null` rows (contain customer name/phone) are returned to every logged-in user; `markRead` has no ownership check.
- **P0-4** Checkout reserves stock with read-then-write (oversell race).
- **P0-5** `updateStatus`/`markPayment`: no transition rules, non-transactional stock changes, double-consume possible, no release on cancel, `status` not validated.
- **P0-6** Cart `quantity` unvalidated (negative values accepted); guest `sessionId` is client-chosen and sent in URLs.
- **P0-7** `/orders/success/[id]` calls admin-only `GET /orders/:id`, so guests/customers cannot see their confirmation.
- P1/P2: no rate limiting; no global auth guard; many `any` bodies/queries without DTOs; no pagination caps; no DB indexes on FK/filter columns; JWT in `localStorage`; `@prisma/client` is in API `devDependencies`; money math uses `Number`; order/booking refs use `Date.now()+random`; `salePrice`/tax/shipping not applied at checkout; no payment integration (CARD is a label only); audit log is never written by services; admin pages have no client guard; web has 51 `no-explicit-any` lint errors; `sitemap.ts` hardcodes localhost.

### Recommendations only (NOT implemented)
Global guard + `@Public()`, `common/` module, `packages/shared`, `(storefront)`/`(admin)` route groups, server-component data fetching, locale routing (`next-intl`), cookie-based auth, permission matrix, BullMQ notifications, full-text/OEM search, payment gateway, image upload pipeline.

## 4. Development guidelines

**TypeScript.** Web is `strict`. API is not strict (`noImplicitAny: false`); still write explicit types, and do not add new `any`. Prefer enums from `@prisma/client` over string literals; no `as any` casts to dodge types.

**NestJS.** One module per domain; keep controllers thin (parse/guard/delegate) and put logic in services. Declare guards explicitly on every route that is not meant to be public. Use `@CurrentUser()` for the authenticated user. Throw Nest HTTP exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, `ForbiddenException`). Reuse existing helpers (e.g. `CustomersService.ensureProfile`) rather than re-querying profiles.

**DTOs / validation.** Every request body and query uses a class-validator DTO (`@IsUUID`, `@IsInt @Min @Max`, `@IsEnum`, `@Matches`, etc.). The global pipe forbids unknown fields. Never accept `any` or inline-typed bodies for new endpoints. Cap pagination (`limit`) and validate enums.

**Prisma.** Schema changes go through `prisma migrate` with a committed migration; never `db push` against shared data. Use `$transaction` for multi-write operations. Use `select`/`include` deliberately. Atomic counters via SQL/`increment`, never read-modify-write. Use `Decimal` for money. Handle `P2002` (unique) explicitly.

**Next.js / React.** Check `node_modules/next/dist/docs/` first. Use `@/` imports, existing `components/ui/*` (`Button`, `Card`, `Feedback`) and the `api` helpers. Keep new pages consistent with existing ones; prefer server components for new public read-only pages when practical. Use `next/image` for new images.

**Error handling.** API: surface meaningful HTTP codes (400 validation, 401/403 auth, 404, 409 conflict); never leak stack traces or internal data. Web: show errors via `Feedback`/inline messages, not silent `.catch(() => {})` in new code.

**Security.** Enforce ownership on every customer-scoped resource (check the resource belongs to the caller). Never return password hashes, tokens, provider refs, other users' data or internal notes. Validate all input. No secrets in code, tests, docs or logs. Do not widen CORS. Keep helmet.

**Performance.** Avoid unbounded lists and deep includes on list endpoints; add indexes with migrations when adding new filter columns; don't introduce N+1 loops.

**Testing.**
- Unit tests: `*.spec.ts` beside the code, Prisma mocked.
- Integration/e2e: `apps/api/test/*.e2e-spec.ts`, real Postgres. Use `createTestApp()` (`test/create-test-app.ts`, applies the same global pipe as `main.ts`). `test/setup-env.ts` forces the `motors_test` database and refuses any database name not ending in `_test`, and generates a random `JWT_SECRET`. Clean up the rows your test creates.
- Every security, inventory, order or booking fix needs a regression test (including concurrency tests where races are involved).
- Report real results; never claim tests passed without running them.

## 5. Business rules (as implemented unless marked)

- **Vehicles and compatibility.** Models (Logan, Sandero, Megane 2/3/4, Duster, Fluence, Captur, Kadjar, Clio, Scenic, Lodgy, Symbol, Koleos) are seeded. Compatibility is per product+model, optionally narrowed by year and variant. Public `GET /vehicles` lists active models; writes need ADMIN/INVENTORY roles.
- **Catalog.** Products have unique `sku`, optional `partCode`/`oemReference`, ar/en translations, category tree, `isActive`/`isPublished`. Public read; writes require SUPER_ADMIN/ADMIN/INVENTORY_MANAGER.
- **Inventory.** `Inventory.stock` is on-hand, `reserved` is held for pending orders; available = `stock - reserved`. Every change should leave an `InventoryMovement`. Stock must never go negative and `reserved` must never exceed `stock`. (Atomic enforcement is not yet implemented; see P0-4.)
- **Cart.** One cart per user or per guest session; `(cartId, productId)` unique; quantity must be a positive integer (not yet enforced; P0-6).
- **Orders and checkout.** Checkout builds an order from the cart, reserves stock, creates a `Payment` (idempotency via `idempotencyKey`) and `OrderStatusHistory`, then clears the cart. Payment methods: CASH, CARD (no gateway). Fulfillment: DELIVERY, PICKUP. Statuses: PENDING_PAYMENT → PAID → PROCESSING → READY_FOR_PICKUP/SHIPPED → DELIVERED, plus CANCELLED/REFUNDED (transitions are not enforced yet; P0-5). Stock is consumed when an order becomes PAID. A user's orders must only be visible to that user; staff (SUPER_ADMIN/ADMIN/ORDER_MANAGER) see all.
- **Service bookings.** Hourly slots 08:00–17:00 (fixed list in `bookings.service.ts`); `BusinessHour` can mark a weekday closed (seed: Sunday closed); `BlockedSlot` blocks a time. A slot can hold one active booking (transaction + unique `slotId`; concurrent duplicates return 409). Cancel/reject frees the slot. Public creation allowed (guest or user); management is SERVICE_MANAGER/ADMIN.
- **Marketplace.** A listing requires exactly 5 image URLs and starts `PENDING_REVIEW`; moderators move it through APPROVED/REJECTED/PUBLISHED/SOLD/EXPIRED with status history. Only `PUBLISHED` listings are public.
- **Wholesale.** Public request submission (currently unvalidated; open to spam); staff (WHOLESALE_MANAGER/ADMIN) manage status, notes and quotations.
- **Dashboard.** `GET /dashboard/overview` aggregates counts and paid revenue for any staff role.
- **Notifications and audit.** Notifications are created for new bookings (more types are defined in the enum but not produced). Intended meaning of `userId = null`: a staff broadcast (not yet enforced; P0-2). `AuditLog` exists and is readable by ADMIN, but services do not write to it yet.

## 6. UI/UX guidelines
- Use brand tokens from `apps/web/src/app/globals.css` (`brand-navy`, `brand-charcoal`, `brand-silver`, `brand-orange`, `brand-blue`, `card`, `border`, `muted`) via Tailwind theme names; do not introduce ad-hoc hex colors.
- Reuse and extend `components/ui/*`; do not duplicate buttons/cards. Prefer `.container-xl` for page width.
- Mobile-first: design for small screens, then scale up with Tailwind breakpoints.
- Every user-facing string goes through `t()` with both `ar` and `en` entries; never hardcode one language.
- Use logical properties (`ms-*`, `me-*`, `ps-*`, `text-start`) rather than `left/right` so RTL and LTR both work. Test both directions.
- Accessibility: meaningful `alt` text, labels on inputs, keyboard-operable controls, sufficient contrast, visible focus.
- Existing pages hold placeholder text/English labels in places (e.g. admin dashboard); do not copy that pattern into new code.

## 7. Commands
Run from the repo root unless noted. Windows host with Git Bash/PowerShell; paths contain spaces, so quote them.

| Purpose | Command | Status |
|---|---|---|
| Install | `npm install` (root) | works (workspace) |
| Start DB/Redis | `npm run db:up` / `npm run db:down` | root scripts wrap `docker compose -f infra/docker-compose.yml` |
| API dev | `npm run dev:api` (needs a valid `JWT_SECRET` in `apps/api/.env`) | works once configured |
| Web dev | `npm run dev:web` | works |
| API type-check | `cd apps/api && npx tsc --noEmit` | verified, clean |
| Web type-check | `cd apps/web && npx tsc --noEmit` | verified, clean |
| API unit tests | `cd apps/api && npx jest` | verified |
| API e2e tests | `cd apps/api && npx jest --config test/jest-e2e.json --runInBand` (uses `motors_test`) | verified |
| Web lint | `cd apps/web && npx eslint` | runs; currently reports 52 errors (mostly `no-explicit-any`) |
| Prisma validate | `cd apps/api && npx prisma validate` | verified |
| Prisma generate | `cd apps/api && npx prisma generate` | standard; not re-run in audit |
| Migrate (dev DB) | `cd apps/api && npx prisma migrate deploy` / `migrate dev` | only with user approval |
| Test DB migrate | `DATABASE_URL="postgresql://…/motors_test?schema=public" npx prisma migrate deploy` | used once to create `motors_test` |
| Seed | `cd apps/api && npx ts-node prisma/seed.ts` | needs `SEED_ADMIN_PASSWORD` or prints a generated one |

**Commands that need correction (do not rely on them as-is):**
- `npm run lint` (root/api): the API script uses `--fix` (rewrites files) and type-checked ESLint **crashes with out-of-memory**. Run ESLint on specific files without `--fix`.
- `npm test` (root): fails because `apps/web` has no `test` script.
- `npm run build`: not verified in the audit (writes `dist/` and `.next/`).
- `contract:emit` in `apps/api/package.json` (`prisma contract emit`) looks invalid for Prisma 6.
- The README previously said to `npm install` per app; use the root install.

Local Postgres: `motors` (dev) and `motors_test` (tests) in the same container on host port 5435.

## 8. Critical engineering rules
1. Never expose customer data across accounts; filter by the authenticated owner, never by a client-supplied id alone.
2. Always enforce resource ownership and role authorization; declare guards on every non-public route.
3. Use database transactions for order, payment and inventory changes.
4. Prevent overselling with atomic inventory updates (conditional `UPDATE … WHERE stock - reserved >= qty`, check affected rows), not read-then-write.
5. Validate all incoming data with DTOs; never trust `body: any`.
6. Never hardcode secrets or credentials, in code, seeds, tests, docs or UI.
7. Never modify production data without explicit approval. Treat any DB other than `motors_test` as precious.
8. Never introduce breaking schema changes without a migration plan the user has approved.
9. Never perform destructive operations (drops, truncates, `migrate reset`, force-push, mass deletes) without explicit approval.
10. Do not return sensitive fields (password hashes, provider refs, internal notes, other users' PII) from any endpoint.
