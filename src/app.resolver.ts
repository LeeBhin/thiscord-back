import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { RecommendationService } from './recommendation/recommendation.service';
import { RecommendedUserType } from './recommendation/recommended-user.type';
import { RecommendedUser } from './interfaces/recommand.interface';

@Resolver(() => RecommendedUserType)
export class AppResolver {
  constructor(private readonly recommendationService: RecommendationService) { }

  @Query(() => [RecommendedUserType])
  async getFriendRecommendations(
    @Args('userId', { type: () => ID }) userId: string
  ): Promise<RecommendedUser[]> {
    return await this.recommendationService.getFriendRecommendations(userId);
  }
}
