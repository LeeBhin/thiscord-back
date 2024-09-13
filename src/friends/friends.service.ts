import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFriendDto } from 'src/dto/create-friend.dto';
import { Friend } from 'src/interfaces/friend.interface';

@Injectable()
export class FriendsService {
    constructor(
        @InjectModel('Friend') private readonly friendModel: Model<Friend>,
        private readonly jwtService: JwtService,
    ) { }

    // 친구 요청
    async sendRequest(createFriendDto: CreateFriendDto): Promise<any> {
        const { userId, friendId } = createFriendDto;

        // 사용자, 친구
        const user = await this.friendModel.findOne({ userid: userId }).exec();
        const friend = await this.friendModel.findOne({ userid: friendId }).exec();

        if (!user || !friend) {
            throw new NotFoundException('User not found');
        }

        // 요청을 보낸 사용자의 friends 배열에서 상태 확인
        const userFriend = user.friends.find(f => f.friendid === friendId);
        if (userFriend) {
            if (userFriend.status === 'accepted') {
                throw new ConflictException('이미 친구입니다.');
            }
            if (userFriend.status === 'pending') {
                throw new ConflictException('이미 요청했습니다.');
            }
        }

        // 사용자 업데이트
        user.friends.push({
            friendid: friendId,
            status: 'pending',
            createdat: new Date(),
        });

        // 친구 업데이트
        friend.friends.push({
            friendid: userId,
            status: 'pending',
            createdat: new Date(),
        });

        // 사용자, 친구 저장
        await user.save();
        await friend.save();

        return { message: 'Friend request sent successfully' };
    }

    // 요청 수락
    async acceptRequest(userid: string, friendid: string): Promise<any> {
    }

    // 삭제
    async deleteFriend(userid: string, friendid: string): Promise<void> {
    }

    // 친구 조회
    async getFriends(userid: string): Promise<any[]> {
        try {
            const friendDocument = await this.friendModel.findOne({ userid }).exec();

            if (!friendDocument) {
                throw new NotFoundException('User not found');
            }
            return friendDocument.friends;

        } catch (err) {
            console.error(err);
            throw new NotFoundException('Error retrieving friends');
        }
    }
}
