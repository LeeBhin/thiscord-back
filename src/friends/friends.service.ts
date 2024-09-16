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
        const myName = (await this.userModel.findOne({ userId }).exec()).name;

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
        const friendUserIndex = friendDocument.friends.findIndex(f => f.friendid === userId);

        if (userFriendIndex !== -1 && user.friends[userFriendIndex].status === 'accepted') {
            throw new ConflictException('이미 친구가 된 사용자예요!');
        }

        if (userFriendIndex !== -1 && user.friends[userFriendIndex].status === 'pending' && user.friends[userFriendIndex].who === myName) {
            throw new ConflictException('이미 친구 요청을 보냈습니다.');
        }

        // 상대방이 요청
        if (friendUserIndex !== -1 && friendDocument.friends[friendUserIndex].status === 'pending' && friendDocument.friends[friendUserIndex].who === friendName) {

            if (userFriendIndex !== -1) {
                user.friends[userFriendIndex].status = 'accepted';
                user.friends[userFriendIndex].createdat = new Date();
            } else {
                user.friends.push({
                    friendid: friendId,
                    status: 'accepted',
                    who: friendName,
                    createdat: new Date(),
                });
            }

            friendDocument.friends[friendUserIndex].status = 'accepted';
            friendDocument.friends[friendUserIndex].createdat = new Date();

            await user.save();
            await friendDocument.save();

            return { message: '친구 요청 수락' };
        }

        // 새로운 친구 요청 추가
        if (userFriendIndex === -1) {
            user.friends.push({
                friendid: friendId,
                status: 'pending',
                who: myName,
                createdat: new Date(),
            });
        } else {
            user.friends[userFriendIndex] = {
                friendid: friendId,
                status: 'pending',
                who: myName,
                createdat: new Date(),
            };
        }

        if (friendUserIndex === -1) {
            friendDocument.friends.push({
                friendid: userId,
                status: 'pending',
                who: myName,
                createdat: new Date(),
            });
        } else {
            friendDocument.friends[friendUserIndex] = {
                friendid: userId,
                status: 'pending',
                who: myName,
                createdat: new Date(),
            };
        }

        await user.save();
        await friendDocument.save();

        return { message: `${friendName}에게 성공적으로 친구 요청을 보냈어요.` };
    }

    // 요청 수락
    async acceptRequest(userid: string, friendName: string): Promise<{ message: string }> {
        // friend
        const friendUser = await this.userModel.findOne({ name: friendName }).exec();
        if (!friendUser) {
            throw new ConflictException('Friend not found');
        }

        const friendId = friendUser.userId;

        // user friends
        const userDocument = await this.friendModel.findOne({ userid }).exec();
        if (!userDocument) {
            throw new ConflictException('User document not found');
        }

        // 사용자 friends pending
        const userFriendIndex = userDocument.friends.findIndex(f => f.friendid === friendId && f.status === 'pending');
        if (userFriendIndex === -1) {
            throw new ConflictException('해당 친구 요청을 찾을 수 없습니다.');
        }

        // friend pending
        const friendDocument = await this.friendModel.findOne({ userid: friendId }).exec();
        if (!friendDocument) {
            throw new ConflictException('Friend document not found');
        }

        const friendUserFriendIndex = friendDocument.friends.findIndex(f => f.friendid === userid && f.status === 'pending');
        if (friendUserFriendIndex === -1) {
            throw new ConflictException('해당 친구 요청을 찾을 수 없습니다.');
        }

        // accepted
        userDocument.friends[userFriendIndex].status = 'accepted';
        userDocument.friends[userFriendIndex].createdat = new Date();

        friendDocument.friends[friendUserFriendIndex].status = 'accepted';
        friendDocument.friends[friendUserFriendIndex].createdat = new Date();

        await userDocument.save();
        await friendDocument.save();

        return { message: '수락 완료' };
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
