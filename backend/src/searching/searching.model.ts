import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum SearchingStatus {
  INPROGRESS = 'INPROGRESS',
  FOUND = 'FOUND',
  CANCELED = 'CANCELED',
}

export enum SearchingType {
  USUAL = 'USUAL',
  VIP = 'VIP',
  STUDENT = 'STUDENT',
}

registerEnumType(SearchingStatus, { name: 'SearchingStatus' });
registerEnumType(SearchingType, { name: 'SearchingType' });

@ObjectType()
export class Searching {
  @Field(() => ID)
  id: string;

  @Field(() => SearchingStatus)
  status: SearchingStatus;

  @Field(() => SearchingType)
  type: SearchingType;

  @Field()
  date: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
