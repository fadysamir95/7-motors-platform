import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}
  list(query: { page?: number; limit?: number; entityType?: string; userId?: string }) {
    const { page = 1, limit = 50, entityType, userId } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    const skip = (Number(page) - 1) * Number(limit);
    return this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      this.prisma.auditLog.count({ where }),
    ]).then(([items, total]) => ({ items, total, page: Number(page), limit: Number(limit) }));
  }
  log(userId: string | undefined, action: string, entityType: string, entityId?: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { userId, action, entityType, entityId, metadata } });
  }
}
