import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private customers: CustomersService,
  ) {}

  async checkout(userId: string | undefined, dto: CheckoutDto) {
    // idempotency
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) {
        const order = await this.prisma.order.findFirst({ where: { payments: { some: { id: existing.id } } }, include: { items: true } });
        return order;
      }
    }

    // get cart
    const cart = await this.prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId: dto.sessionId },
      include: { items: { include: { product: { include: { inventory: true } } } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    // validate stock & prices
    for (const item of cart.items) {
      const inv = item.product.inventory;
      if (!inv || inv.stock - inv.reserved < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.product.sku}`);
      }
    }

    const subtotal = cart.items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
    const tax = 0;
    const shippingFee = dto.fulfillmentMethod === 'DELIVERY' ? 0 : 0;
    const total = subtotal + tax + shippingFee;

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await this.prisma.$transaction(async (tx) => {
      // Reserve stock atomically. Items are processed in a stable order so that two checkouts touching the
      // same products always take row locks in the same sequence (no deadlocks).
      const items = [...cart.items].sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
      for (const item of items) {
        await this.reserveStock(tx, item.productId, item.quantity, item.product.sku);
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: userId ? (await this.getCustomerId(userId)) : undefined,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING',
          paymentMethod: dto.paymentMethod as any,
          fulfillmentMethod: dto.fulfillmentMethod as any,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          subtotal,
          tax,
          shippingFee,
          total,
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.product.price,
              subtotal: Number(i.product.price) * i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          method: dto.paymentMethod as any,
          status: 'PENDING',
          amount: total,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: createdOrder.id, status: 'PENDING_PAYMENT', note: 'Order created' },
      });

      // clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return createdOrder;
    });

    return order;
  }

  /**
   * Reserves `quantity` units with ONE conditional UPDATE: the availability check and the increment happen in
   * the same statement, so concurrent checkouts can never reserve more than `stock - reserved`
   * (a read-then-write here loses updates and oversells). Throws inside a transaction to roll everything back.
   */
  private async reserveStock(tx: Prisma.TransactionClient, productId: string, quantity: number, sku: string) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new BadRequestException(`Invalid quantity for ${sku}`);
    const updated = await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reserved" = "reserved" + ${quantity}, "updatedAt" = NOW() AT TIME ZONE 'UTC'
      WHERE "productId" = ${productId} AND "stock" - "reserved" >= ${quantity}`;
    if (updated !== 1) throw new BadRequestException(`Insufficient stock for ${sku}`);
  }

  private async getCustomerId(userId: string): Promise<string | undefined> {
    return (await this.customers.ensureProfile(userId)).id;
  }

  /** Orders belonging to the authenticated user only. Never reads filters from the client. */
  async listMine(userId: string) {
    const profile = await this.customers.ensureProfile(userId);
    return this.listOrders({ profileId: profile.id });
  }

  async listOrders(query: any) {
    const { status, paymentStatus, customerId, profileId, page = 1, limit = 20 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (profileId) where.customerId = profileId;
    if (customerId) {
      // Admin filter: customerId is a user id. An unresolvable id must match nothing,
      // never fall through to an unfiltered query.
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId: customerId } });
      where.customerId = profile?.id ?? '__no_match__';
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: { include: { product: { include: { translations: true } } } }, customer: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: { include: { translations: true, images: true } } } }, customer: true, payments: true, statusHistory: true, shipment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: any, note?: string, userId?: string) {
    const order = await this.getOrder(id);
    // handle stock consumption on PAID/processing? Consume reserved stock when shipped/delivered? 
    // For simplicity consume on PAID
    if (status === 'PAID' && order.paymentStatus !== 'PAID') {
      for (const item of order.items) {
        await this.prisma.inventory.update({
          where: { productId: item.productId },
          data: { reserved: { decrement: item.quantity } },
        });
        // decrement stock
        await this.prisma.inventory.update({
          where: { productId: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }
    const updated = await this.prisma.order.update({ where: { id }, data: { status } });
    await this.prisma.orderStatusHistory.create({ data: { orderId: id, status, note, changedBy: userId } });
    return updated;
  }

  async markPayment(orderId: string, status: any, providerRef?: string) {
    const order = await this.getOrder(orderId);
    await this.prisma.payment.updateMany({ where: { orderId }, data: { status, providerRef } });
    const paymentStatus = status;
    await this.prisma.order.update({ where: { id: orderId }, data: { paymentStatus } });
    if (status === 'PAID') {
      await this.updateStatus(orderId, 'PAID', 'Payment confirmed');
    }
    return this.getOrder(orderId);
  }
}
