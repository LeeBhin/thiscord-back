import { Injectable, Inject } from '@nestjs/common';
import { NEO4J_CONNECTION } from './neo4j.constants';
import { Connection } from 'cypher-query-builder';
import { UserService } from '../user/user.service';
import { RecommendedUser } from 'src/interfaces/recommand.interface';

@Injectable()
export class QueryRepository {
  constructor(
    @Inject(NEO4J_CONNECTION)
    private readonly connection: Connection,
    private readonly userService: UserService
  ) { }

  async getFriendRecommendations(userId: string): Promise<RecommendedUser[]> {
    try {
      const query = this.connection.query()
        .raw(`
          MATCH (me:Person {userId: $userId})-[:FRIEND]-(mutualFriend:Person)-[:FRIEND]-(potentialFriend:Person)
          WHERE NOT (me)-[:FRIEND]-(potentialFriend) 
          AND me <> potentialFriend
          WITH potentialFriend, 
               COLLECT(DISTINCT mutualFriend.userId) AS mutualFriendIds,
               COUNT(DISTINCT mutualFriend) AS friendCount
          WHERE friendCount >= 2
          RETURN potentialFriend.userId as recommendedUserId,
                 mutualFriendIds
        `, { userId });

      const results = await query.run();

      const recommendedUsers = await Promise.all(
        results.map(async (result) => {
          const user = await this.userService.findById(result.recommendedUserId);

          const mutualFriends = await Promise.all(
            result.mutualFriendIds.map(async (friendId: string) => {
              const friend = await this.userService.findById(friendId);
              return friend.name;
            })
          );

          return {
            name: user.name,
            iconColor: user.iconColor,
            mutualFriends: mutualFriends
          };
        })
      );

      return recommendedUsers;
    } catch (error) {
      console.error('Error fetching friend recommendations:', error);
      throw new Error('Failed to fetch friend recommendations.');
    }
  }

  onApplicationShutdown() {
    this.connection.close();
  }
}