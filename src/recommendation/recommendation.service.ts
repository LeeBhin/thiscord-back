import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Friend } from 'src/interfaces/friend.interface';
import { UserService } from '../user/user.service';
import { RecommendedUser } from 'src/interfaces/recommand.interface';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectModel('Friend') private readonly friendModel: Model<Friend>,
    private readonly userService: UserService
  ) { }

  async getFriendRecommendations(userId: string): Promise<RecommendedUser[]> {
    try {
      // 사용자의 친구 목록 조회 (accepted만)
      const userFriends = await this.friendModel
        .findOne({ userid: userId })
        .select('friends')
        .lean()
        .exec();

      if (!userFriends?.friends?.length) {
        return [];
      }

      const acceptedFriendIds = userFriends.friends
        .filter(friend => friend.status === 'accepted')
        .map(friend => friend.friendid);

      if (acceptedFriendIds.length === 0) {
        return [];
      }

      // 친구들의 친구 목록을 효율적으로 조회
      const friendsOfFriends = await this.friendModel.aggregate([
        {
          $match: {
            userid: { $in: acceptedFriendIds }
          }
        },
        {
          $unwind: '$friends'
        },
        {
          $match: {
            'friends.status': 'accepted',
            'friends.friendid': { $nin: [...acceptedFriendIds, userId] }
          }
        },
        {
          $group: {
            _id: '$friends.friendid',
            mutualFriends: { $addToSet: '$userid' },
            mutualCount: { $sum: 1 }
          }
        },
        {
          $match: {
            mutualCount: { $gte: 2 }
          }
        },
        {
          $sort: { mutualCount: -1 }
        },
        {
          $limit: 10 // 최대 10명만 추천
        }
      ]);

      if (!friendsOfFriends.length) {
        return [];
      }

      // 추천할 사용자들의 정보 조회 (필요한 필드만)
      const recommendedUserIds = friendsOfFriends.map(item => item._id);
      const users = await this.userService.findUsersByIds(recommendedUserIds);

      // 공통 친구들의 이름 조회 (배치로 처리)
      const allMutualFriendIds = [...new Set(
        friendsOfFriends.flatMap(item => item.mutualFriends)
      )];
      const mutualFriendsData = await this.userService.findUsersByIds(allMutualFriendIds);
      
      const userIdToNameMap = new Map(
        mutualFriendsData.map(user => [user.userId, user.name])
      );

      // 결과 조합
      const recommendations = friendsOfFriends.map(item => {
        const user = users.find(u => u.userId === item._id);
        const mutualFriendNames = item.mutualFriends
          .map(friendId => userIdToNameMap.get(friendId))
          .filter(Boolean);

        return {
          name: user?.name || 'Unknown',
          iconColor: user?.iconColor || '#B9BBBE',
          mutualFriends: mutualFriendNames
        };
      });

      return recommendations;
    } catch (error) {
      console.error('Error fetching friend recommendations:', error);
      return [];
    }
  }
}
