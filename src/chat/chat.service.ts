import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, mongo, ObjectId } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from '../schemas/chatRoom.schema';
import { User } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { Request } from 'express';
import { Friend } from 'src/interfaces/friend.interface';

let PAGE_SIZE = 30;

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
        private userService: UserService,
        @InjectModel('Friend') private readonly friendModel: Model<Friend>
    ) { }

    async findByName(name: string): Promise<User | null> {
        return this.userService.findByName(name);
    }

    async saveMessage(_id: string, senderId: string, receiverId: string, message: string, messageId: mongoose.Types.ObjectId): Promise<ChatRoom> {
        const chatRoom = await this.chatRoomModel.findById(_id);
        if (!chatRoom) {
            throw new Error('Chat room not found');
        }

        const newMessage = {
            senderId,
            message,
            timestamp: new Date(),
            isRead: {
                [senderId]: true,
                [receiverId]: false
            },
            isEdit: false,
            _id: messageId
        };

        chatRoom.messages.push(newMessage);
        chatRoom.lastMessageAt = new Date();

        return chatRoom.save();
    }

    async createChatRoom(userId: string, participants: string[]): Promise<ChatRoom> {

        const existingChatRoom = await this.chatRoomModel.findOne({
            participants: { $all: participants }
        }).exec();

        if (existingChatRoom) {
            console.log('Chat room already exists');
            return null;
        }

        const userFriendDocument = await this.friendModel.findOne({ userid: userId }).exec();
        if (!userFriendDocument) {
            console.log('User not found');
        }

        const acceptedFriends = userFriendDocument.friends
            .filter(friend => friend.status === 'accepted')
            .map(friend => friend.friendid);

        const invalidParticipants = participants.filter(participant => participant !== userId && !acceptedFriends.includes(participant));

        if (invalidParticipants.length > 0) {
            console.log('not your friend')
            return;
        }

        const newChatRoom = new this.chatRoomModel({
            participants,
            messages: [],
        });

        return newChatRoom.save();
    }

    async getChatRoomMessages(roomId: string): Promise<ChatRoom> {
        return this.chatRoomModel.findById(roomId).exec();
    }

    async findChatRoomByParticipants(senderId: string, receiverId: string): Promise<ChatRoom | null> {
        return this.chatRoomModel.findOne({
            participants: { $all: [senderId, receiverId] },
        }).exec();
    }

    async getChatHistory(req: Request, receiverName: string, lastReadMsgId?: string, direction?: string, pageSize?: number): Promise<any> {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        if (pageSize) PAGE_SIZE = pageSize;

        const decoded = this.userService.verifyToken(token);
        const senderId = decoded.userId;

        const receiver = await this.userService.findByName(receiverName);
        if (!receiver) {
            return {
                message: 'receiver not found',
                messages: [],
                totalCount: 0,
                senderId
            };
        }

        const chatRoom = await this.findChatRoomByParticipants(senderId, receiver.userId);
        if (!chatRoom) {
            await this.createChatRoom(senderId, [senderId, receiver.userId]);
            return {
                message: 'chatroom not found',
                messages: [],
                totalCount: 0,
                senderId
            };
        }

        if (lastReadMsgId === chatRoom.messages.at(-1)?._id.toString()) {
            return {
                message: 'last message',
                messages: [],
                totalCount: chatRoom.messages.length
            };
        }
        if (lastReadMsgId === chatRoom.messages.at(0)?._id.toString()) {
            return {
                message: 'first message',
                messages: [],
                totalCount: chatRoom.messages.length
            };
        }

        let messages;

        if (lastReadMsgId) {
            const lastReadIndex = chatRoom.messages.findIndex(
                msg => msg._id.toString() === lastReadMsgId
            );

            if (lastReadIndex === -1) {
                throw new NotFoundException('Last read message not found');
            }

            let startIndex, endIndex;

            if (direction === 'up') {
                startIndex = Math.max(0, lastReadIndex - PAGE_SIZE);
                endIndex = lastReadIndex;
            } else if (direction === 'down') {
                startIndex = lastReadIndex + 1;
                endIndex = Math.min(chatRoom.messages.length, startIndex + PAGE_SIZE);
            } else {
                throw new BadRequestException('Invalid direction specified');
            }

            messages = chatRoom.messages.slice(startIndex, endIndex);

            return {
                messages,
                senderId,
                totalCount: chatRoom.messages.length
            };

        } else {
            const lastReadMessage = chatRoom.messages
                .filter(msg => msg.isRead[senderId])
                .pop();

            let messages = [];

            if (lastReadMessage) {
                const lastReadIndex = chatRoom.messages.findIndex(
                    msg => msg._id.toString() === lastReadMessage._id.toString()
                );

                const startIndex = Math.max(0, lastReadIndex - 70);

                const endIndex = chatRoom.messages.length;
                messages = [
                    ...chatRoom.messages.slice(startIndex, lastReadIndex + 1),
                    ...chatRoom.messages.slice(lastReadIndex + 1, endIndex)
                ];
            } else {
                messages = chatRoom.messages.slice(-50);
            }

            return {
                messages,
                senderId,
                totalCount: chatRoom.messages.length
            };
        }
    }

    async getMyChatrooms(req: Request): Promise<any> {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const senderId = decoded.userId;

        const chatRooms = await this.chatRoomModel.find({
            participants: senderId,
        });

        const otherParticipants = await Promise.all(chatRooms.map(async (room) => {
            const otherParticipantId = room.participants.find((participantId) => participantId !== senderId);

            const otherParticipant = await this.userService.findById(otherParticipantId);

            return {
                participantName: otherParticipant?.name || 'Unknown',
                iconColor: otherParticipant?.iconColor || '#000000',
                lastMessageAt: room.lastMessageAt
            };
        }));

        return otherParticipants;
    }

    async deleteMsg(req: Request, msgId: string, senderId: string, receiverName: string): Promise<any> {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        const receiverUser = await this.userService.findByName(receiverName);
        const receiverUserId = receiverUser.userId;

        if (userId != userId) {
            return new UnauthorizedException('no access');
        }

        const chatRoom = await this.chatRoomModel.findOne({
            participants: { $all: [userId, receiverUserId] }
        });

        if (!chatRoom) {
            throw new NotFoundException('Chatroom not found');
        }

        const index = chatRoom.messages.findIndex((message) => message._id.toString() === msgId);
        if (index !== -1) {
            chatRoom.messages.splice(index, 1);
        }

        await chatRoom.save();

        return { success: true };
    }

    async editMsg(req: Request, msgId: string, senderId: string, receiverName: string, newMessage: string): Promise<any> {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        const receiverUser = await this.userService.findByName(receiverName);
        const receiverUserId = receiverUser.userId;

        if (userId !== senderId) {
            throw new UnauthorizedException('No access to edit this message');
        }

        const chatRoom = await this.chatRoomModel.findOne({
            participants: { $all: [userId, receiverUserId] }
        });

        if (!chatRoom) {
            throw new NotFoundException('Chat room not found');
        }

        const messageIndex = chatRoom.messages.findIndex((msg) => msg._id.toString() === msgId);
        if (messageIndex === -1) {
            throw new NotFoundException('Message not found');
        }

        chatRoom.messages[messageIndex].message = newMessage;
        chatRoom.messages[messageIndex].isEdit = true;

        await chatRoom.save();
        return { success: true };
    }

    async readMessage(req: Request, msgId: string, receiverName: string): Promise<any> {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        const receiverUser = await this.userService.findByName(receiverName);
        const receiverUserId = receiverUser.userId;

        const chatRoom = await this.chatRoomModel.findOne({
            participants: { $all: [userId, receiverUserId] },
        });

        if (!chatRoom) {
            throw new NotFoundException('Chat room not found');
        }

        const messageIndex = chatRoom.messages.findIndex((msg) => msg._id.toString() === msgId);
        if (messageIndex === -1) {
            throw new NotFoundException('Message not found');
        }

        if (chatRoom.messages[messageIndex]) {
            chatRoom.messages[messageIndex].isRead[userId] = true;
        }

        chatRoom.markModified(`messages.${messageIndex}.isRead`);
        await chatRoom.save();

        return { success: true };
    }

}
