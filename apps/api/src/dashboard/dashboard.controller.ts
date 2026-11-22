import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'MARKETPLACE_MODERATOR', 'WHOLESALE_MANAGER')
  overview() {
    return this.service.overview();
  }
}
