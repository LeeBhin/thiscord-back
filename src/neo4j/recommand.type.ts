import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class RecommendedUserType {
    @Field()
    name: string;

    @Field()
    iconColor: string;

    @Field(() => [String])
    mutualFriends: string[];
}