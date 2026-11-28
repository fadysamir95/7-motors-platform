import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Throttle } from '@nestjs/throttler';
import { SlotsQueryDto } from './dto/slots-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private service: BookingsService) {}

  @Get('service-types')
  serviceTypes() {
    return this.service.listServiceTypes();
  }

  @Get('slots')
  slots(@Query() query: SlotsQueryDto) {
    return this.service.availableSlots(query.date);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.service.createBooking(req.user?.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER')
  list(@Query() query: any) {
    return this.service.listBookings(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER')
  get(@Param('id') id: string) {
    return this.service.getBooking(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER')
  updateStatus(@Param('id') id: string, @Body() body: { status: string; note?: string }, @CurrentUser() user: any) {
    return this.service.updateStatus(id, body.status, body.note, user?.id);
  }

  @Post('block-slot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER')
  blockSlot(@Body() body: { date: string; startTime: string; reason?: string }, @CurrentUser() user: any) {
    return this.service.blockSlot(body.date, body.startTime, body.reason, user?.id);
  }
}
