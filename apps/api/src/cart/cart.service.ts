import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateCart(userId?: string, sessionId?: string) {
    if (userId) {
      let cart = await this.prisma.cart.findUnique({ where: { userId } });
      if (!cart) cart = await this.prisma.cart.create({ data: { userId } });
      return cart;
    }
    if (sessionId) {
      let cart = await this.prisma.cart.findUnique({ where: { sessionId } });
      if (!cart) cart = await this.prisma.cart.create({ data: { sessionId } });
      return cart;
    }
    throw new BadRequestException('userId or sessionId required');
  }

  async getCart(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: { include: { translations: true, images: true, inventory: true } } } } },
    });
  }

  async addItem(userId: string | undefined, sessionId: string | undefined, productId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) throw new NotFoundException('Product not found');
    const existing = await this.prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    if (existing) {
      return this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
    }
    return this.prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
  }

  async updateItem(userId: string | undefined, sessionId: string | undefined, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    if (quantity <= 0) return this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(userId: string | undefined, sessionId: string | undefined, itemId: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clear(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { success: true };
  }
}
