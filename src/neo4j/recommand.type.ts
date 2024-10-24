import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class RecommendedUserType {
    @Field(() => ID)
    userId: string;

    @Field()
    name: string;
}