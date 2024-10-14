import { Schema, Document } from 'mongoose';

export interface PushSubscription extends Document {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    userId: string;
}

export const PushSubscriptionSchema = new Schema<PushSubscription>({
    endpoint: { type: String, required: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userId: { type: String, required: true },
});
