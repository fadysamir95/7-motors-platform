import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private service: MarketplaceService) {}

  @Get('listings')
  listPublic(@Query() query: any) {
    return this.service.listPublic(query);
  }

  @Get('listings/:id')
  get(@Param('id') id: string) {
    return this.service.getListing(id);
  }

  @Post('listings')
  @UseGuards(OptionalJwtAuthGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.service.createListing(req.user?.id, body);
  }

  @Get('admin/listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETPLACE_MODERATOR')
  listAdmin(@Query() query: any) {
    return this.service.listAdmin(query);
  }

  @Patch('admin/listings/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETPLACE_MODERATOR')
  updateStatus(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.updateStatus(id, body.status, body.note, user?.id, body.rejectionReason);
  }
}
