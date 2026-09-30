import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  NotificationsService,
  NotificationItem,
} from './notifications.service.js';
import { MarkSeenDto } from './dto/mark-seen.dto.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(): Promise<NotificationItem[]> {
    return this.notificationsService.findAll();
  }

  @Post('seen')
  markSeen(@Body() dto: MarkSeenDto) {
    return this.notificationsService.markSeen(dto.ids ?? []);
  }
}