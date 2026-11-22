import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() req: any) { return this.service.list(req.user?.id); }
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  unread(@Req() req: any) { return this.service.unreadCount(req.user?.id); }
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  read(@Param('id') id: string) { return this.service.markRead(id); }
}
