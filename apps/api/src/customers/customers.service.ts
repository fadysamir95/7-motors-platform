import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns the CustomerProfile of a user, creating it if missing.
   * Idempotent and race-safe (upsert on the unique userId), so it also covers
   * users who registered before profiles were created at registration.
   */
  async ensureProfile(userId: string): Promise<CustomerProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.customerProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0],
        phone: user.phone ?? '',
      },
    });
  }
}
