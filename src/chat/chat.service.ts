import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from '../schemas/chatRoom.schema';
import { User } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
        private userService: UserService,
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

    async createChatRoom(participants: string[]): Promise<ChatRoom> {
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
}
