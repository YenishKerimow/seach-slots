import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  TicketClass,
  TicketSearching,
  TicketSearchingStatus,
} from './ticket-searching.model';
import { TicketSearchingService } from './ticket-searching.service';
import { CreateTicketSearchingInput } from './dto/create-ticket-searching.input';

@Resolver(() => TicketSearching)
export class TicketSearchingResolver {
  constructor(private readonly service: TicketSearchingService) {}

  @Query(() => [TicketSearching], { name: 'ticketSearchings' })
  findAll() {
    return this.service.findAll();
  }

  @Query(() => TicketSearching, { name: 'ticketSearching' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.service.findOne(id);
  }

  /** Creates one TicketSearching per day in the range. */
  @Mutation(() => [TicketSearching])
  createTicketSearchings(@Args('input') input: CreateTicketSearchingInput) {
    return this.service.create(input);
  }

  @Mutation(() => TicketSearching)
  updateTicketSearchingStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status', { type: () => TicketSearchingStatus })
    status: TicketSearchingStatus,
  ) {
    return this.service.updateStatus(id, status);
  }

  @Mutation(() => TicketSearching)
  updateTicketSearchingClass(
    @Args('id', { type: () => ID }) id: string,
    @Args('ticketClass', { type: () => TicketClass }) ticketClass: TicketClass,
  ) {
    return this.service.updateClass(id, ticketClass);
  }

  @Mutation(() => TicketSearching)
  removeTicketSearching(@Args('id', { type: () => ID }) id: string) {
    return this.service.remove(id);
  }

  /** Bulk delete; returns the number of removed ticket searchings. */
  @Mutation(() => Int)
  removeTicketSearchings(
    @Args('ids', { type: () => [ID] }) ids: string[],
  ): Promise<number> {
    return this.service.removeMany(ids);
  }
}
