import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema()
export class ChatMessage {
    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true })
    message: string;

    @Prop({ required: true })
    receiverId: string;

    @Prop({ default: Date.now })
    timestamp: Date;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: false })
    isEdit: boolean;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
