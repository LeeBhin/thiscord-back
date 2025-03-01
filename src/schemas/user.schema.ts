import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
    @Prop({ unique: true })
    userId: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    phoneOrEmail: string;

    @Prop({ required: true })
    password: string;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop()
    iconColor: string;

    @Prop({ default: null })
    fcmToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);