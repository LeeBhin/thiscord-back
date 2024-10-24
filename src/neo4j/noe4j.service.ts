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
          MATCH (me:Person {userId: $userId})-[:FRIEND]-(friend)-[:FRIEND]-(potentialFriend:Person)
          WHERE NOT (me)-[:FRIEND]-(potentialFriend) 
          AND me <> potentialFriend
          WITH DISTINCT potentialFriend, COUNT(friend) AS friendCount
          WHERE friendCount >= 2
          RETURN potentialFriend.userId as recommendedUserId
        `, { userId });

      const results = await query.run();
      const recommendedUserIds = results.map(result => result.recommendedUserId);

      const recommendedUsers = await Promise.all(
        recommendedUserIds.map(async (recommendedId) => {
          const user = await this.userService.findById(recommendedId);
          return {
            userId: recommendedId,
            name: user.name
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
