import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Searching, SearchingStatus } from './searching.model';
import { SearchingService } from './searching.service';
import { CreateSearchingInput } from './dto/create-searching.input';

@Resolver(() => Searching)
export class SearchingResolver {
  constructor(private readonly searchingService: SearchingService) {}

  @Query(() => [Searching], { name: 'searchings' })
  findAll() {
    return this.searchingService.findAll();
  }

  @Query(() => Searching, { name: 'searching' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.searchingService.findOne(id);
  }

  /**
   * Accepts a date range and a type, and creates one Searching per day in the
   * range. Returns every created entity.
   */
  @Mutation(() => [Searching])
  createSearchings(@Args('input') input: CreateSearchingInput) {
    return this.searchingService.create(input);
  }

  @Mutation(() => Searching)
  updateSearchingStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status', { type: () => SearchingStatus }) status: SearchingStatus,
  ) {
    return this.searchingService.updateStatus(id, status);
  }

  @Mutation(() => Searching)
  removeSearching(@Args('id', { type: () => ID }) id: string) {
    return this.searchingService.remove(id);
  }

  /** Bulk delete; returns the number of removed searchings. */
  @Mutation(() => Int)
  removeSearchings(
    @Args('ids', { type: () => [ID] }) ids: string[],
  ): Promise<number> {
    return this.searchingService.removeMany(ids);
  }
}
