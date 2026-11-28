import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { BookingsModule } from './bookings/bookings.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { WholesaleModule } from './wholesale/wholesale.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Every route is rate limited per client address (generous default; the sensitive routes set stricter limits).
    // The counters live in memory, so with several API instances they are per instance. RATE_LIMIT=off disables it (tests only).
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
      skipIf: () => process.env.RATE_LIMIT === 'off',
    }),
    PrismaModule,
    AuthModule,
    VehiclesModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    BookingsModule,
    MarketplaceModule,
    WholesaleModule,
    DashboardModule,
    AuditModule,
    SettingsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
