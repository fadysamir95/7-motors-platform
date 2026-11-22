import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.inventory.findMany({ include: { product: { include: { translations: true } } } });
  }

  async get(productId: string) {
    const inv = await this.prisma.inventory.findUnique({ where: { productId }, include: { product: true, movements: { orderBy: { createdAt: 'desc' }, take: 50 } } });
    if (!inv) throw new NotFoundException('Inventory not found');
    return inv;
  }

  async adjust(productId: string, dto: AdjustStockDto, userId?: string) {
    const inv = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!inv) throw new NotFoundException('Inventory not found');
    const type = dto.type || 'ADJUSTMENT';
    const newStock = type === 'OUT' ? inv.stock - dto.quantity : inv.stock + dto.quantity;
    const [updated] = await this.prisma.$transaction([
      this.prisma.inventory.update({ where: { productId }, data: { stock: newStock } }),
      this.prisma.inventoryMovement.create({
        data: { inventoryId: inv.id, type: type as any, quantity: dto.quantity, note: dto.note, createdBy: userId },
      }),
    ]);
    return updated;
  }

  async reserve(productId: string, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { productId } });
      if (!inv) throw new NotFoundException('Inventory not found');
      const available = inv.stock - inv.reserved;
      if (available < quantity) throw new Error('Insufficient stock');
      return tx.inventory.update({ where: { productId }, data: { reserved: inv.reserved + quantity } });
    });
  }

  async release(productId: string, quantity: number) {
    const inv = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!inv) return;
    await this.prisma.inventory.update({ where: { productId }, data: { reserved: Math.max(0, inv.reserved - quantity) } });
  }

  async consume(productId: string, quantity: number) {
    const inv = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!inv) throw new NotFoundException('Inventory not found');
    await this.prisma.inventory.update({
      where: { productId },
      data: { stock: inv.stock - quantity, reserved: Math.max(0, inv.reserved - quantity) },
    });
  }
}
