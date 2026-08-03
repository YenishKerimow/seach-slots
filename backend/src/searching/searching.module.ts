import { Module } from '@nestjs/common';
import { SearchingResolver } from './searching.resolver';
import { SearchingService } from './searching.service';

@Module({
  providers: [SearchingResolver, SearchingService],
  exports: [SearchingService],
})
export class SearchingModule {}
