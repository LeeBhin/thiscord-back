import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from '../schemas/chatRoom.schema';
import { User } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { Request } from 'express';
import { Friend } from 'src/interfaces/friend.interface';

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

    async saveMessage(_id: string, senderId: string, message: string): Promise<ChatRoom> {
        const chatRoom = await this.chatRoomModel.findById(_id);
        if (!chatRoom) {
            throw new Error('Chat room not found');
        }

        chatRoom.messages.push({
            senderId,
            message,
            timestamp: new Date(),
            isRead: false,
            isEdit: false,
        });

        chatRoom.lastMessageAt = new Date();
        return chatRoom.save();
    }

    async createChatRoom(userId: string, participants: string[]): Promise<ChatRoom> {
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

    async getChatHistory(req: Request, receiverName: string): Promise<any> {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const senderId = decoded.userId;

        const receiverId = await this.userService.findByName(receiverName);
        if (!receiverId) {
            throw new Error('Receiver not found');
        }

        const chatRoom = await this.findChatRoomByParticipants(senderId, receiverId.userId);
        if (!chatRoom) {
            console.log('chatroom not found')
            this.createChatRoom(senderId, [senderId, receiverId.userId]);
            return {}
        }

        return chatRoom.messages;
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

        const sendUser = await this.userService.findByName(senderId);
        const sendUserId = sendUser.userId;

        if (userId != sendUserId) {
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

        const senderUser = await this.userService.findByName(senderId);
        const senderUserId = senderUser.userId;

        if (userId !== senderUserId) {
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
}
