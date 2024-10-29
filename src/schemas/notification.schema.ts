import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubscriptionDto } from 'src/dto/notification.dto';

@Schema()
export class NotificationHistory {
    @Prop()
    title: string;

    @Prop()
    body: string;

    @Prop()
    url?: string;

    @Prop({ type: [Object] })
    actions?: Array<{
        action: string;
        title: string;
    }>;

    @Prop()
    sentAt: Date;
}

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: Types.ObjectId;

    @Prop({ type: Object, required: true })
    subscription: SubscriptionDto;

    @Prop({ type: [NotificationHistory] })
    history: NotificationHistory[];
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);