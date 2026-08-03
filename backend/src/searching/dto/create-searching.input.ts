import { Field, InputType } from '@nestjs/graphql';
import { IsDate, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SearchingType } from '../searching.model';

@InputType()
export class DateRangeInput {
  @Field()
  @Type(() => Date)
  @IsDate()
  from: Date;

  @Field()
  @Type(() => Date)
  @IsDate()
  to: Date;
}

@InputType()
export class CreateSearchingInput {
  /**
   * Inclusive date range. One Searching entity is created per day in the range,
   * e.g. { from: 2026-10-01, to: 2026-10-04 } creates 4 entities.
   */
  @Field(() => DateRangeInput)
  @ValidateNested()
  @Type(() => DateRangeInput)
  dates: DateRangeInput;

  @Field(() => SearchingType, { defaultValue: SearchingType.USUAL })
  @IsEnum(SearchingType)
  type: SearchingType;
}
