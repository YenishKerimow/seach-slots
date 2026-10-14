import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ScraperModule } from '../scraper/scraper.module';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScraperModule, TelegramModule, NotificationsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
