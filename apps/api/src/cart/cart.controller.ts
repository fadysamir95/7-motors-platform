import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(private service: CartService) {}

  private ids(req: any, query: any) {
    const userId = req.user?.id;
    const sessionId = (query?.sessionId as string) || req.headers['x-session-id'];
    return { userId, sessionId };
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  get(@Req() req: any, @Query() query: any) {
    const { userId, sessionId } = this.ids(req, query);
    return this.service.getCart(userId, sessionId);
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  addItem(@Req() req: any, @Query() query: any, @Body() body: { productId: string; quantity: number }) {
    const { userId, sessionId } = this.ids(req, query);
    return this.service.addItem(userId, sessionId, body.productId, body.quantity ?? 1);
  }

  @Patch('items/:id')
  @UseGuards(OptionalJwtAuthGuard)
  updateItem(@Req() req: any, @Query() query: any, @Param('id') id: string, @Body() body: { quantity: number }) {
    const { userId, sessionId } = this.ids(req, query);
    return this.service.updateItem(userId, sessionId, id, body.quantity);
  }

  @Delete('items/:id')
  @UseGuards(OptionalJwtAuthGuard)
  removeItem(@Req() req: any, @Query() query: any, @Param('id') id: string) {
    const { userId, sessionId } = this.ids(req, query);
    return this.service.removeItem(userId, sessionId, id);
  }

  @Delete()
  @UseGuards(OptionalJwtAuthGuard)
  clear(@Req() req: any, @Query() query: any) {
    const { userId, sessionId } = this.ids(req, query);
    return this.service.clear(userId, sessionId);
  }
}
