import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Friend } from 'src/interfaces/friend.interface';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class FriendsService {
    constructor(
        @InjectModel('Friend') private readonly friendModel: Model<Friend>,
        @InjectModel('User') private readonly userModel: Model<User>,
        private readonly jwtService: JwtService,
    ) { }

    // 친구 요청
    async sendRequest(userId: string, friendName: string): Promise<any> {

        // 사용자
        const user = await this.friendModel.findOne({ userid: userId }).exec();
        if (!user) {
            throw new NotFoundException('사용자를 찾을 수 없음');
        }

        // 친구 이름 -> userid
        const friend = await this.userModel.findOne({ name: friendName }).exec();
        if (!friend) {
            throw new NotFoundException('친구를 찾을 수 없음');
        }

        const friendId = friend.userId;

        // 사용자 배열 상태 확인
        const userFriendIndex = user.friends.findIndex(f => f.friendid === friendId);

        // 친구 배열 상태 확인
        const friendDocument = await this.friendModel.findOne({ userid: friendId }).exec();
        if (!friendDocument) {
            throw new NotFoundException('Friend user document not found');
        }

        const friendUserFriendIndex = friendDocument.friends.findIndex(f => f.friendid === userId);

        if (userFriendIndex !== -1 && friendUserFriendIndex !== -1) {
            if (user.friends[userFriendIndex].status === 'pending' && friendDocument.friends[friendUserFriendIndex].status === 'pending') {
                // 서로 요청 보냈을 때 수락 처리
                user.friends[userFriendIndex].status = 'accepted';
                user.friends[userFriendIndex].createdat = new Date();

                friendDocument.friends[friendUserFriendIndex].status = 'accepted';
                friendDocument.friends[friendUserFriendIndex].createdat = new Date();

                // 사용자, 친구 저장
                await user.save();
                await this.friendModel.findOneAndUpdate({ userid: friendId }, { friends: friendDocument.friends }, { new: true });

                return { message: 'Friend request accepted successfully' };
            } else if (user.friends[userFriendIndex].status === 'accepted') {
                throw new ConflictException('Already friends');
            } else if (user.friends[userFriendIndex].status === 'pending') {
                throw new ConflictException('Request already sent');
            }
        }

        // 사용자 배열에 친구 요청 추가
        user.friends.push({
            friendid: friendId,
            status: 'pending',
            createdat: new Date(),
        });

        // 친구 배열에 추가
        friendDocument.friends.push({
            friendid: userId,
            status: 'pending',
            createdat: new Date(),
        });

        // 사용자, 친구 저장
        await user.save();
        await friendDocument.save();

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

    // 새로운 사용자 추가
    async createFriendDocument(userId: string): Promise<void> {
        // 기본 문서 생성
        const newFriendDocument = new this.friendModel({
            userid: userId,
            friends: []
        });
        await newFriendDocument.save();
    }
}
