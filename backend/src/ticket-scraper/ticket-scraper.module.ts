import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TelegramModule } from '../telegram/telegram.module';
import { AirlineClient } from './airline.client';
import { TicketSearchProcessor } from './ticket-search.processor';
import { TicketSearchScheduler } from './ticket-search.scheduler';
import { TICKET_SEARCH_QUEUE } from './ticket-scraper.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: TICKET_SEARCH_QUEUE }),
    TelegramModule,
  ],
  providers: [AirlineClient, TicketSearchProcessor, TicketSearchScheduler],
})
export class TicketScraperModule {}
