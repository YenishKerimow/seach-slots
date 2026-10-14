import { Module } from '@nestjs/common';
import { TicketSearchingResolver } from './ticket-searching.resolver';
import { TicketSearchingService } from './ticket-searching.service';

@Module({
  providers: [TicketSearchingResolver, TicketSearchingService],
  exports: [TicketSearchingService],
})
export class TicketSearchingModule {}
