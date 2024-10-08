import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ChatRoomDocument = ChatRoom & Document;

@Schema()
export class ChatRoom {
    @Prop({ required: true })
    participants: string[];

    @Prop({ default: Date.now })
    lastMessageAt: Date;

    @Prop({ type: [{ senderId: String, message: String, timestamp: Date, isRead: Boolean, isEdit: Boolean }] })
    messages: {
        senderId: string;
        message: string;
        timestamp: Date;
        isRead: boolean;
        isEdit: boolean;
        _id?: string;
    }[];

    @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
    _id: mongoose.Types.ObjectId;

}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
