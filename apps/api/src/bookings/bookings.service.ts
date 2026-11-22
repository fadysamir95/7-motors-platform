import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  listServiceTypes() {
    return this.prisma.serviceType.findMany({ where: { isActive: true }, include: { translations: true }, orderBy: { sortOrder: 'asc' } });
  }

  async availableSlots(dateStr: string) {
    const date = new Date(dateStr);
    // business hours: check BusinessHour for dayOfWeek
    const dayOfWeek = date.getDay();
    const bh = await this.prisma.businessHour.findUnique({ where: { dayOfWeek } });
    if (bh?.isClosed) return [];

    // blocked slots for date
    const blocked = await this.prisma.blockedSlot.findMany({ where: { date } });
    const blockedSet = new Set(blocked.map((b) => b.startTime));

    // existing bookings
    const bookings = await this.prisma.serviceBooking.findMany({
      where: { date, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      select: { startTime: true },
    });
    const bookedSet = new Set(bookings.map((b) => b.startTime));

    return SLOTS.map((s) => ({
      startTime: s,
      endTime: this.endTime(s),
      available: !blockedSet.has(s) && !bookedSet.has(s),
    }));
  }

  private endTime(start: string) {
    const [h] = start.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:00`;
  }

  async createBooking(userId: string | undefined, dto: any) {
    const date = new Date(dto.date);
    if (!SLOTS.includes(dto.startTime)) throw new BadRequestException('Invalid slot');
    const endTime = this.endTime(dto.startTime);

    try {
      const booking = await this.prisma.$transaction(async (tx) => {
      // revalidate availability
      const existingBooking = await tx.serviceBooking.findFirst({
        where: { date, startTime: dto.startTime, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      });
      if (existingBooking) throw new ConflictException('Slot already booked');

      const blocked = await tx.blockedSlot.findFirst({ where: { date, startTime: dto.startTime } });
      if (blocked) throw new ConflictException('Slot blocked');

      // find or create slot record
      let slot = await tx.bookingSlot.findUnique({ where: { date_startTime: { date, startTime: dto.startTime } } });
      if (!slot) {
        slot = await tx.bookingSlot.create({ data: { date, startTime: dto.startTime, endTime } });
      }
      if (slot.isBlocked) throw new ConflictException('Slot blocked');

      // ensure no booking references this slot
      const slotBooked = await tx.serviceBooking.findUnique({ where: { slotId: slot.id } });
      if (slotBooked) throw new ConflictException('Slot already booked');

      let customerId: string | undefined;
      if (userId) {
        const profile = await tx.customerProfile.findUnique({ where: { userId } });
        customerId = profile?.id;
      }

      const bookingRef = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const booking = await tx.serviceBooking.create({
        data: {
          bookingRef,
          customerId,
          createdBy: userId,
          fullName: dto.fullName,
          phone: dto.phone,
          licenseNumber: dto.licenseNumber,
          modelId: dto.modelId,
          variantId: dto.variantId,
          vin: dto.vin,
          vehicleYear: dto.vehicleYear,
          slotId: slot.id,
          date,
          startTime: dto.startTime,
          endTime,
          status: 'PENDING_CONFIRMATION',
          notes: dto.notes,
          orderId: dto.orderId,
          services: {
            create: dto.serviceTypeIds.map((sid: string) => ({ serviceTypeId: sid })),
          },
        },
        include: { services: { include: { serviceType: { include: { translations: true } } } } },
      });

      return booking;
    });
      await this.notifications.create({
        type: 'BOOKING_CREATED',
        title: 'New booking request',
        body: `${dto.fullName} - ${dto.date} ${dto.startTime}`,
        data: { bookingRef: (booking as any).bookingRef },
      });
      return booking;
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('Slot already booked');
      throw err;
    }
  }

  async listBookings(query: any) {
    const { status, date, page = 1, limit = 50 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (date) where.date = new Date(date);
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.serviceBooking.findMany({
        where,
        include: { services: { include: { serviceType: { include: { translations: true } } } }, model: true, slot: true },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
        skip,
        take: Number(limit),
      }),
      this.prisma.serviceBooking.count({ where }),
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async getBooking(id: string) {
    const b = await this.prisma.serviceBooking.findUnique({
      where: { id },
      include: { services: { include: { serviceType: { include: { translations: true } } } }, model: true, slot: true, statusHistory: true, order: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async updateStatus(id: string, status: string, note?: string, userId?: string) {
    const booking = await this.getBooking(id);
    const updated = await this.prisma.serviceBooking.update({ where: { id }, data: { status: status as any } });
    await this.prisma.bookingStatusHistory.create({ data: { bookingId: id, status: status as any, note, changedBy: userId } });
    // if cancelled/rejected, release slot (delete booking? keep). Slot unique booking removed? booking still references slot. 
    // To allow reuse, set slotId null on cancel/reject.
    if (status === 'CANCELLED' || status === 'REJECTED') {
      await this.prisma.serviceBooking.update({ where: { id }, data: { slotId: null } });
    }
    return updated;
  }

  async blockSlot(dateStr: string, startTime: string, reason?: string, userId?: string) {
    const date = new Date(dateStr);
    await this.prisma.blockedSlot.create({ data: { date, startTime, reason, createdBy: userId } });
    // also mark booking slot if exists
    const slot = await this.prisma.bookingSlot.findUnique({ where: { date_startTime: { date, startTime } } });
    if (slot) await this.prisma.bookingSlot.update({ where: { id: slot.id }, data: { isBlocked: true } });
    return { success: true };
  }
}
