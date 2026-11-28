import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isStaff } from '../auth/staff-roles';

type Viewer = { id: string; roles: string[] };

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * A notification with no user is a staff broadcast (it names customers, for example a new booking), so only
   * staff may see it. Everyone else sees only what was addressed to them.
   */
  private visibleTo(viewer: Viewer): Prisma.NotificationWhereInput {
    return isStaff(viewer.roles) ? { OR: [{ userId: viewer.id }, { userId: null }] } : { userId: viewer.id };
  }

  list(viewer: Viewer) {
    return this.prisma.notification.findMany({ where: this.visibleTo(viewer), orderBy: { createdAt: 'desc' }, take: 100 });
  }

  unreadCount(viewer: Viewer) {
    return this.prisma.notification.count({ where: { AND: [this.visibleTo(viewer), { isRead: false }] } });
  }

  /** Marks one notification as read, but only one the viewer is allowed to see. */
  async markRead(viewer: Viewer, id: string) {
    const changed = await this.prisma.notification.updateMany({ where: { AND: [{ id }, this.visibleTo(viewer)] }, data: { isRead: true } });
    if (changed.count === 0) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findUniqueOrThrow({ where: { id } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  create(data: Prisma.NotificationUncheckedCreateInput) {
    return this.prisma.notification.create({ data });
  }
}
