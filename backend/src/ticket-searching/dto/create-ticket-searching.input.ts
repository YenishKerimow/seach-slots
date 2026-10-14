import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DateRangeInput } from '../../searching/dto/create-searching.input';
import { TicketClass } from '../ticket-searching.model';

@InputType()
export class CreateTicketSearchingInput {
  /** Inclusive date range; one TicketSearching is created per day. */
  @Field(() => DateRangeInput)
  @ValidateNested()
  @Type(() => DateRangeInput)
  dates: DateRangeInput;

  @Field(() => TicketClass, { defaultValue: TicketClass.BOTH })
  @IsEnum(TicketClass)
  ticketClass: TicketClass;
}
