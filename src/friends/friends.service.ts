import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Friend } from 'src/interfaces/friend.interface';
import { ChatRoom } from 'src/schemas/chatRoom.schema';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class FriendsService {
    constructor(
        @InjectModel('Friend') private readonly friendModel: Model<Friend>,
        @InjectModel('User') private readonly userModel: Model<User>,
        @InjectModel('ChatRoom') private readonly chatRoomModel: Model<ChatRoom>,
        private readonly jwtService: JwtService,
    ) { }

    async sendRequest(userId: string, friendName: string): Promise<any> {
        // 먼저 사용자의 Friend 문서가 존재하는지 확인하고, 없으면 생성
        let user = await this.friendModel.findOne({ userid: userId }).exec();
        if (!user) {
            const userData = await this.userModel.findOne({ userId }).select('name').lean().exec();
            await this.createFriendDocument(userId, userData?.name || 'Unknown');
            user = await this.friendModel.findOne({ userid: userId }).exec();
        }

        const [friend] = await Promise.all([
            this.userModel.findOne({ name: friendName }).select('userId name').lean().exec()
        ]);

        const myName = (await this.userModel.findOne({ userId }).select('name').lean().exec()).name;

        if (!user) {
            throw new ConflictException('user not found');
        }

        if (!friend) {
            throw new ConflictException('흠, 안 되는군요. 사용자명을 올바르게 입력했는지 확인하세요.');
        }

        const friendId = friend.userId;
        
        // 친구의 Friend 문서도 확인하고 없으면 생성
        let friendDocument = await this.friendModel.findOne({ userid: friendId }).exec();
        if (!friendDocument) {
            await this.createFriendDocument(friendId, friend.name);
            friendDocument = await this.friendModel.findOne({ userid: friendId }).exec();
        }

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

        // 상대방이 요청한 경우 자동 수락
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

            await Promise.all([user.save(), friendDocument.save()]);

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

        await Promise.all([user.save(), friendDocument.save()]);

        return { message: `${friendName}에게 성공적으로 친구 요청을 보냈어요.` };
    }

    // 요청 수락
    async acceptRequest(userid: string, friendName: string): Promise<{ message: string }> {
        const friendUser = await this.userModel.findOne({ name: friendName }).select('userId').lean().exec();
        if (!friendUser) {
            throw new ConflictException('Friend not found');
        }

        const friendId = friendUser.userId;

        const [userDocument, friendDocument] = await Promise.all([
            this.friendModel.findOne({ userid }).exec(),
            this.friendModel.findOne({ userid: friendId }).exec()
        ]);

        if (!userDocument || !friendDocument) {
            throw new ConflictException('User document not found');
        }

        const userFriendIndex = userDocument.friends.findIndex(f => f.friendid === friendId && f.status === 'pending');
        const friendUserFriendIndex = friendDocument.friends.findIndex(f => f.friendid === userid && f.status === 'pending');
        
        if (userFriendIndex === -1 || friendUserFriendIndex === -1) {
            throw new ConflictException('해당 친구 요청을 찾을 수 없습니다.');
        }

        // 친구 상태를 accepted로 변경
        userDocument.friends[userFriendIndex].status = 'accepted';
        userDocument.friends[userFriendIndex].createdat = new Date();

        friendDocument.friends[friendUserFriendIndex].status = 'accepted';
        friendDocument.friends[friendUserFriendIndex].createdat = new Date();

        await Promise.all([userDocument.save(), friendDocument.save()]);

        return { message: '수락 완료' };
    }

    // 삭제
    async deleteFriend(userid: string, friendName: string): Promise<boolean> {
        try {
            const friend = await this.userModel.findOne({ name: friendName }).select('userId').lean().exec();
            if (!friend) {
                throw new ConflictException('Friend not found');
            }
            const friendId = friend.userId;

            const [userDocument, friendDocument] = await Promise.all([
                this.friendModel.findOne({ userid }).exec(),
                this.friendModel.findOne({ userid: friendId }).exec()
            ]);

            if (!userDocument || !friendDocument) {
                throw new ConflictException('User document not found');
            }

            // 친구 관계 제거
            userDocument.friends = userDocument.friends.filter(friendArray =>
                friendArray.friendid !== friendId
            );

            friendDocument.friends = friendDocument.friends.filter(friendArray =>
                friendArray.friendid !== userid
            );

            // 채팅방 삭제
            const operations = [
                userDocument.save(),
                friendDocument.save(),
                this.chatRoomModel.deleteOne({
                    participants: { $all: [userid, friendId] }
                }).exec()
            ];

            await Promise.all(operations);

            return true;

        } catch (err) {
            console.error(err);
            throw new ConflictException('delete_friend Error');
        }
    }

    async getFriends(userid: string): Promise<{ name: string, iconColor: string }[]> {
        try {
            const friendDocument = await this.friendModel
                .findOne({ userid })
                .select('friends')
                .lean()
                .exec();
                
            if (!friendDocument) {
                // Friend 문서가 없는 경우 새로 생성
                console.log(`Friend document not found for user ${userid}, creating new one`);
                await this.createFriendDocument(userid, 'Unknown');
                return [];
            }

            if (!friendDocument.friends || friendDocument.friends.length === 0) {
                return [];
            }

            const acceptedFriends = friendDocument.friends.filter(friend => friend.status === 'accepted');
            const friendIds = acceptedFriends.map(friend => friend.friendid);

            if (friendIds.length === 0) {
                return [];
            }

            const friends = await this.userModel
                .find({ userId: { $in: friendIds } })
                .select('name iconColor')
                .lean()
                .exec();

            return friends.map(friend => ({
                name: friend.name,
                iconColor: friend.iconColor
            }));

        } catch (err) {
            console.error('Error in getFriends:', err);
            // 빈 배열 반환으로 더 안전하게 처리
            return [];
        }
    }

    async getPendingFriends(userid: string): Promise<{ name: string, iconColor: string, who: string }[]> {
        try {
            const friendDocument = await this.friendModel
                .findOne({ userid })
                .select('friends')
                .lean()
                .exec();
                
            if (!friendDocument) {
                // Friend 문서가 없는 경우 새로 생성
                console.log(`Friend document not found for user ${userid}, creating new one`);
                await this.createFriendDocument(userid, 'Unknown');
                return [];
            }

            if (!friendDocument.friends || friendDocument.friends.length === 0) {
                return [];
            }

            const pendingFriends = friendDocument.friends.filter(friend => friend.status === 'pending');
            const friendIds = pendingFriends.map(friend => friend.friendid);

            if (friendIds.length === 0) {
                return [];
            }

            const friends = await this.userModel
                .find({ userId: { $in: friendIds } })
                .select('name iconColor userId')
                .lean()
                .exec();

            return friends.map(friend => {
                const pendingFriend = pendingFriends.find(pf => pf.friendid === friend.userId);
                return {
                    name: friend.name,
                    iconColor: friend.iconColor,
                    who: pendingFriend.who
                };
            });

        } catch (err) {
            console.error('Error in getPendingFriends:', err);
            // 빈 배열 반환으로 더 안전하게 처리
            return [];
        }
    }

    // 새로운 사용자 추가 (개선된 버전)
    async createFriendDocument(userId: string, name: string): Promise<void> {
        try {
            // 이미 존재하는지 확인
            const existing = await this.friendModel.findOne({ userid: userId }).lean().exec();
            if (existing) {
                console.log(`Friend document already exists for user ${userId}`);
                return;
            }

            const newFriendDocument = new this.friendModel({
                userid: userId,
                name: name,
                friends: []
            });
            await newFriendDocument.save();
            console.log(`Created friend document for user ${userId}`);
        } catch (error) {
            console.error(`Error creating friend document for user ${userId}:`, error);
            // 중복 키 오류는 무시 (이미 존재하는 경우)
            if (error.code !== 11000) {
                throw error;
            }
        }
    }
}