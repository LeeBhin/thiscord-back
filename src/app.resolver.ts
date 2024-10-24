import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { QueryRepository } from './neo4j/noe4j.service';
import { RecommendedUserType } from './neo4j/recommand.type';
import { RecommendedUser } from './interfaces/recommand.interface';

@Resolver(() => RecommendedUserType)
export class AppResolver {
  constructor(private readonly queryRepository: QueryRepository) { }

  @Query(() => [RecommendedUserType])
  async getFriendRecommendations(
    @Args('userId', { type: () => ID }) userId: string
  ): Promise<RecommendedUser[]> {
    return await this.queryRepository.getFriendRecommendations(userId);
  }
}