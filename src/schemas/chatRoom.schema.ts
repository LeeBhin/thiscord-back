import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ChatRoomDocument = ChatRoom & Document;

@Schema()
export class ChatRoom {
    @Prop({ required: true })
    participants: string[];

    @Prop({ default: Date.now })
    lastMessageAt: Date;

    @Prop({
        type: [{
            senderId: String,
            message: String,
            timestamp: Date,
            isRead: { type: Object, default: {} },
            isEdit: Boolean,
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true }
        }]
    })
    messages: {
        senderId: string;
        message: string;
        timestamp: Date;
        isRead: { [userId: string]: boolean };
        isEdit: boolean;
        _id: mongoose.Types.ObjectId;
    }[];

    @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
    _id: mongoose.Types.ObjectId;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
