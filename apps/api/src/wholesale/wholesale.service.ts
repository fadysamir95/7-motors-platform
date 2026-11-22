import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WholesaleService {
  constructor(private prisma: PrismaService) {}

  async createRequest(dto: any) {
    const req = await this.prisma.wholesaleRequest.create({
      data: {
        businessName: dto.businessName,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        city: dto.city,
        businessType: dto.businessType,
        notes: dto.notes,
        items: {
          create: (dto.items || []).map((i: any) => ({
            productName: i.productName,
            partCode: i.partCode,
            modelId: i.modelId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    });
    return req;
  }

  async listRequests(query: any) {
    const { status, page = 1, limit = 50 } = query;
    const where: any = {};
    if (status) where.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.wholesaleRequest.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.wholesaleRequest.count({ where }),
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async getRequest(id: string) {
    const r = await this.prisma.wholesaleRequest.findUnique({ where: { id }, include: { items: true, quotations: true, notesHistory: true } });
    if (!r) throw new NotFoundException('Request not found');
    return r;
  }

  async updateStatus(id: string, status: string, note?: string, userId?: string) {
    await this.getRequest(id);
    const updated = await this.prisma.wholesaleRequest.update({ where: { id }, data: { status: status as any } });
    if (note) await this.prisma.wholesaleNote.create({ data: { requestId: id, note, createdBy: userId } });
    return updated;
  }

  async addNote(id: string, note: string, userId?: string) {
    await this.getRequest(id);
    return this.prisma.wholesaleNote.create({ data: { requestId: id, note, createdBy: userId } });
  }

  async addQuotation(id: string, amount: number, details: string, userId?: string) {
    await this.getRequest(id);
    return this.prisma.wholesaleQuotation.create({ data: { requestId: id, amount, details, createdBy: userId } });
  }
}
