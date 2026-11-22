import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Post('checkout')
  @UseGuards(OptionalJwtAuthGuard)
  checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    const userId = req.user?.id;
    return this.service.checkout(userId, dto);
  }

  @Get('me/list')
  @UseGuards(JwtAuthGuard)
  myOrders(@CurrentUser() user: any) {
    return this.service.listMine(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER')
  list(@Query() query: any) {
    return this.service.listOrders(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER')
  get(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER')
  updateStatus(@Param('id') id: string, @Body() body: { status: string; note?: string }, @CurrentUser() user: any) {
    return this.service.updateStatus(id, body.status, body.note, user?.id);
  }

  @Post(':id/payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER')
  markPayment(@Param('id') id: string, @Body() body: { status: string; providerRef?: string }) {
    return this.service.markPayment(id, body.status, body.providerRef);
  }
}
