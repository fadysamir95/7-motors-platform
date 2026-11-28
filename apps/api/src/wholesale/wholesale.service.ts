import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartsRequestDto } from './dto/create-parts-request.dto';

/** Marks wholesale rows that came from the shopper "can't find my part" form, so staff can tell them apart. */
export const PARTS_REQUEST_TYPE = 'PARTS_REQUEST';

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

  async createPartsRequest(dto: CreatePartsRequestDto) {
    if (dto.modelId) {
      const model = await this.prisma.vehicleModel.findUnique({ where: { id: dto.modelId }, select: { id: true } });
      if (!model) throw new BadRequestException('Unknown vehicle model');
    }
    const req = await this.prisma.wholesaleRequest.create({
      data: {
        businessName: dto.fullName,
        contactPerson: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        businessType: PARTS_REQUEST_TYPE,
        notes: dto.notes,
        items: { create: [{ productName: dto.partName, modelId: dto.modelId, quantity: dto.quantity ?? 1, notes: dto.notes }] },
      },
      select: { id: true, status: true, createdAt: true },
    });
    // Only the reference is returned: the submitted contact details are not echoed back to an anonymous caller.
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
