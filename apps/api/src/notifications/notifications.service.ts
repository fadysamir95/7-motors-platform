import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}
  list(userId?: string) {
    return this.prisma.notification.findMany({
      where: userId ? { OR: [{ userId }, { userId: null }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  unreadCount(userId?: string) {
    return this.prisma.notification.count({ where: { OR: [{ userId, isRead: false }, { userId: null, isRead: false }] } });
  }
  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }
  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
  create(data: any) {
    return this.prisma.notification.create({ data });
  }
}
