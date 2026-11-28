import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * Changes on-hand stock with ONE conditional UPDATE, so concurrent adjustments and checkouts cannot push it below
   * zero or below the units already reserved for pending orders. Every change leaves a movement row.
   */
  async adjust(productId: string, dto: AdjustStockDto, userId?: string) {
    const inv = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!inv) throw new NotFoundException('Inventory not found');
    const type = dto.type || 'ADJUSTMENT';
    if (type === 'ADJUSTMENT' ? dto.quantity === 0 : dto.quantity <= 0) {
      throw new BadRequestException(type === 'ADJUSTMENT' ? 'An adjustment cannot be 0' : 'quantity must be a positive number of units');
    }
    const delta = type === 'OUT' ? -dto.quantity : dto.quantity;
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "stock" = "stock" + ${delta}, "updatedAt" = NOW() AT TIME ZONE 'UTC'
        WHERE "productId" = ${productId} AND "stock" + ${delta} >= "reserved"`;
      if (changed !== 1) throw new BadRequestException('Stock cannot go below zero or below the units already reserved');
      await tx.inventoryMovement.create({
        data: { inventoryId: inv.id, type: type as any, quantity: dto.quantity, note: dto.note, createdBy: userId },
      });
      return tx.inventory.findUniqueOrThrow({ where: { productId } });
    });
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
