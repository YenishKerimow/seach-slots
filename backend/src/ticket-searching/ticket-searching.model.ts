import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum TicketSearchingStatus {
  INPROGRESS = 'INPROGRESS',
  FOUND = 'FOUND',
  /** The flight day passed without a matching ticket. */
  NOT_FOUND = 'NOT_FOUND',
  CANCELED = 'CANCELED',
}

/** Cabin a searching is looking for. */
export enum TicketClass {
  ECONOMY = 'ECONOMY',
  BUSINESS = 'BUSINESS',
  BOTH = 'BOTH',
}

/** Cabin of an actual flight offer on the airline site. */
export enum CabinClass {
  ECONOMY = 'ECONOMY',
  BUSINESS = 'BUSINESS',
}

registerEnumType(TicketSearchingStatus, { name: 'TicketSearchingStatus' });
registerEnumType(TicketClass, { name: 'TicketClass' });
registerEnumType(CabinClass, { name: 'CabinClass' });

/** One distinct flight offer (fare variants differing only by price merged). */
@ObjectType()
export class FoundFlight {
  /** e.g. `T5901` or `911` (`T5911+T5921` for connections). */
  @Field()
  flightNumber: string;

  @Field(() => CabinClass)
  cabinClass: CabinClass;

  /** ISO date (YYYY-MM-DD) of departure. */
  @Field()
  date: string;

  /** Local departure time, `HH:mm`. */
  @Field()
  departureTime: string;

  /** Local arrival time, `HH:mm`. */
  @Field()
  arrivalTime: string;
}

@ObjectType()
export class TicketSearching {
  @Field(() => ID)
  id: string;

  @Field(() => TicketSearchingStatus)
  status: TicketSearchingStatus;

  @Field(() => TicketClass)
  ticketClass: TicketClass;

  @Field()
  date: Date;

  @Field(() => [FoundFlight], { nullable: true })
  foundFlights?: FoundFlight[] | null;

  @Field({ nullable: true })
  foundAt?: Date | null;

  @Field({ nullable: true })
  lastCheckedAt?: Date | null;

  @Field(() => Int)
  checksCount: number;

  @Field({ nullable: true })
  lastError?: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
