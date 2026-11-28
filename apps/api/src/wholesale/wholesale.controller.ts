import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WholesaleService } from './wholesale.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePartsRequestDto } from './dto/create-parts-request.dto';

@Controller('wholesale')
export class WholesaleController {
  constructor(private service: WholesaleService) {}

  @Post('requests')
  create(@Body() body: any) {
    return this.service.createRequest(body);
  }

  /** Public: a shopper asks for a part that is not in the catalog. Staff see it in the wholesale request list. */
  @Post('parts-requests')
  createPartsRequest(@Body() dto: CreatePartsRequestDto) {
    return this.service.createPartsRequest(dto);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'WHOLESALE_MANAGER')
  list(@Query() query: any) {
    return this.service.listRequests(query);
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'WHOLESALE_MANAGER')
  get(@Param('id') id: string) {
    return this.service.getRequest(id);
  }

  @Patch('requests/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'WHOLESALE_MANAGER')
  updateStatus(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.updateStatus(id, body.status, body.note, user?.id);
  }

  @Post('requests/:id/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'WHOLESALE_MANAGER')
  addNote(@Param('id') id: string, @Body() body: { note: string }, @CurrentUser() user: any) {
    return this.service.addNote(id, body.note, user?.id);
  }

  @Post('requests/:id/quotations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'WHOLESALE_MANAGER')
  addQuotation(@Param('id') id: string, @Body() body: { amount: number; details: string }, @CurrentUser() user: any) {
    return this.service.addQuotation(id, body.amount, body.details, user?.id);
  }
}
