import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type Viewer = { id: string; roles: string[] };

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: Viewer) { return this.service.list(user); }
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  unread(@CurrentUser() user: Viewer) { return this.service.unreadCount(user); }
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  read(@CurrentUser() user: Viewer, @Param('id') id: string) { return this.service.markRead(user, id); }
}
