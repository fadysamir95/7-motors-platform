import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async createListing(userId: string | undefined, dto: any) {
    // validate images count = 5
    if (!dto.images || dto.images.length !== 5) throw new BadRequestException('Exactly 5 photos required');
    let customerId: string | undefined;
    if (userId) {
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId } });
      customerId = profile?.id;
      if (!profile && userId) {
        // create minimal profile? skip
      }
    }
    const listing = await this.prisma.carListing.create({
      data: {
        sellerId: customerId,
        createdBy: userId,
        modelId: dto.modelId,
        year: dto.year,
        price: dto.price,
        mileage: dto.mileage,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        condition: dto.condition,
        description: dto.description,
        status: 'PENDING_REVIEW',
        images: { create: dto.images.map((url: string, i: number) => ({ url, sortOrder: i })) },
      },
      include: { images: true },
    });
    return listing;
  }

  async listPublic(query: any) {
    const { modelId, year, minPrice, maxPrice, mileage, transmission, fuelType, page = 1, limit = 20 } = query;
    const where: any = { status: 'PUBLISHED' };
    if (modelId) where.modelId = modelId;
    if (year) where.year = Number(year);
    if (transmission) where.transmission = transmission;
    if (fuelType) where.fuelType = fuelType;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (mileage) where.mileage = { lte: Number(mileage) };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.carListing.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } }, model: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.carListing.count({ where }),
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async getListing(id: string) {
    const l = await this.prisma.carListing.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } }, model: true, statusHistory: true },
    });
    if (!l) throw new NotFoundException('Listing not found');
    return l;
  }

  async listAdmin(query: any) {
    const { status, page = 1, limit = 50 } = query;
    const where: any = {};
    if (status) where.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.carListing.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } }, model: true, seller: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.carListing.count({ where }),
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async updateStatus(id: string, status: string, note?: string, userId?: string, rejectionReason?: string) {
    const listing = await this.getListing(id);
    const data: any = { status };
    if (status === 'PUBLISHED') data.publishedAt = new Date();
    if (status === 'SOLD') data.soldAt = new Date();
    if (rejectionReason) data.rejectionReason = rejectionReason;
    const updated = await this.prisma.carListing.update({ where: { id }, data });
    await this.prisma.carListingStatusHistory.create({ data: { listingId: id, status: status as any, note, changedBy: userId } });
    return updated;
  }
}
