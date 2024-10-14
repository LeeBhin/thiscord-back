import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { PushSubscription } from 'src/schemas/push.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PushService {
    constructor(
        private configService: ConfigService,
        private userService: UserService,
        @InjectModel('PushSubscription') private pushModel: Model<PushSubscription>,
    ) {
        const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');

        webpush.setVapidDetails(
            'mailto:22a617h0659@sonline20.sen.go.kr',
            vapidPublicKey,
            vapidPrivateKey,
        );
    }

    async saveSubscription(subscription: PushSubscription, req: any): Promise<PushSubscription> {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        const subscriptionWithUserId = { ...subscription, userId };

        return this.pushModel.create(subscriptionWithUserId);
    }

    async sendPushNotification(userId: string, payload: any): Promise<void> {
        const subscriptions = await this.pushModel.find({ userId }).exec();

        subscriptions.forEach(subscription => {
            webpush.sendNotification(subscription, JSON.stringify(payload))
                .catch(err => {
                    console.error('Error sending notification', err);
                });
        });
    }
}
