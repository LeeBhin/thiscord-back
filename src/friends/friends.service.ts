import { Injectable, ConflictException } from '@nestjs/common';
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


    async sendRequest(userId: string, friendName: string): Promise<any> {
        const user = await this.friendModel.findOne({ userid: userId }).exec();
        if (!user) {
            throw new ConflictException('user not found');
        }

        const friend = await this.userModel.findOne({ name: friendName }).exec();
        if (!friend) {
            throw new ConflictException('흠, 안 되는군요. 사용자명을 올바르게 입력했는지 확인하세요.');
        }

        const friendId = friend.userId;
        const friendDocument = await this.friendModel.findOne({ userid: friendId }).exec();
        if (!friendDocument) {
            throw new ConflictException('Friend user document not found');
        }

        if (userId === friendId) {
            throw new ConflictException('자신에게 요청을 보낼 수 없어요.');
        }

        const userFriendIndex = user.friends.findIndex(f => f.friendid === friendId);
        const friendUserFriendIndex = friendDocument.friends.findIndex(f => f.friendid === userId);

        // 이미 친구 상태 또는 요청 상태인지 확인
        if (userFriendIndex !== -1) {
            const userStatus = user.friends[userFriendIndex].status;

            if (userStatus === 'accepted') {
                throw new ConflictException('이미 친구가 된 사용자예요!');
            }
            if (userStatus === 'pending') {
                throw new ConflictException('이미 친구 요청을 보냈습니다.');
            }
        }

        // 친구가 이미 나에게 요청을 보낸 상태면 수락 처리
        if (friendUserFriendIndex !== -1 && friendDocument.friends[friendUserFriendIndex].status === 'pending') {
            user.friends.push({
                friendid: friendId,
                status: 'accepted',
                who: friendName,
                createdat: new Date(),
            });

            friendDocument.friends[friendUserFriendIndex].status = 'accepted';
            friendDocument.friends[friendUserFriendIndex].createdat = new Date();

            await user.save();
            await friendDocument.save();

            return { message: '친구 요청을 수락했습니다.' };
        }

        const myName = (await this.userModel.findOne({ userId }).exec()).name;

        // 새로운 친구 요청 추가
        user.friends.push({
            friendid: friendId,
            status: 'pending',
            who: myName,
            createdat: new Date(),
        });

        friendDocument.friends.push({
            friendid: userId,
            status: 'pending',
            who: myName,
            createdat: new Date(),
        });

        await user.save();
        await friendDocument.save();

        return { message: `${friendName}에게 성공적으로 친구 요청을 보냈어요.` };
    }

    // 요청 수락
    async acceptRequest(userid: string, friend: string): Promise<any> {

    }

    // 삭제
    async deleteFriend(userid: string, friendName: string): Promise<boolean> {
        try {
            // 사용자 문서
            const userDocument = await this.friendModel.findOne({ userid }).exec();
            if (!userDocument) {
                throw new ConflictException('User not found');
            }

            // 친구 userId
            const friend = await this.userModel.findOne({ name: friendName }).exec();
            if (!friend) {
                throw new ConflictException('Friend not found');
            }
            const friendId = friend.userId;

            // 사용자 friends 배열 삭제
            userDocument.friends = userDocument.friends.filter(friendArray =>
                friendArray.friendid !== friendId
            );

            // 친구 friends 배열 삭제
            const friendDocument = await this.friendModel.findOne({ userid: friendId }).exec();
            if (!friendDocument) {
                throw new ConflictException('Friend user document not found');
            }
            friendDocument.friends = friendDocument.friends.filter(friendArray =>
                friendArray.friendid !== userid
            );

            await userDocument.save();
            await friendDocument.save();

            const success = true;

            return success;

        } catch (err) {
            console.error(err);
            throw new ConflictException('delete_friend Error');
        }

    }

    async getFriends(userid: string): Promise<{ name: string, iconColor: string }[]> {
        try {
            // 사용자 문서
            const friendDocument = await this.friendModel.findOne({ userid }).exec();
            if (!friendDocument) {
                throw new ConflictException('User not found');
            }

            // 상태 accepted 인것만
            const acceptedFriends = friendDocument.friends.filter(friend => friend.status === 'accepted');

            // userid
            const friendIds = acceptedFriends.map(friend => friend.friendid);

            // name, iconColor
            const friends = await this.userModel.find({ userId: { $in: friendIds } }).exec();

            return friends.map(friend => ({
                name: friend.name,
                iconColor: friend.iconColor
            }));

        } catch (err) {
            console.error(err);
            throw new ConflictException('get_friends Error');
        }
    }

    async getPendingFriends(userid: string): Promise<{ name: string, iconColor: string, who: string }[]> {
        try {
            // 사용자 문서
            const friendDocument = await this.friendModel.findOne({ userid }).exec();
            if (!friendDocument) {
                throw new ConflictException('User not found');
            }

            // 상태 pending 인것만
            const pendingFriends = friendDocument.friends.filter(friend => friend.status === 'pending');

            // userid
            const friendIds = pendingFriends.map(friend => friend.friendid);

            // name, iconColor
            const friends = await this.userModel.find({ userId: { $in: friendIds } }).exec();

            return friends.map(friend => {
                const pendingFriend = pendingFriends.find(pf => pf.friendid === friend.userId);
                return {
                    name: friend.name,
                    iconColor: friend.iconColor,
                    who: pendingFriend.who
                };
            });

        } catch (err) {
            console.error(err);
            throw new ConflictException('get_friends Error');
        }
    }


    // 새로운 사용자 추가
    async createFriendDocument(userId: string, name: string): Promise<void> {
        // 기본 문서 생성
        const newFriendDocument = new this.friendModel({
            userid: userId,
            name: name,
            friends: []
        });
        await newFriendDocument.save();
    }
}
