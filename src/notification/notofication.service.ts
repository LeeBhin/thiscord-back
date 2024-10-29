import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationDocument } from 'src/schemas/notification.schema';
import { SubscriptionDto, NotificationDto } from '../dto/notification.dto'

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel(Notification.name)
        private notificationModel: Model<NotificationDocument>,
        private configService: ConfigService
    ) {
        webpush.setVapidDetails(
            `mailto:${this.configService.get<string>('VAPID_SUBJECT')}`,
            this.configService.get<string>('VAPID_PUBLIC_KEY'),
            this.configService.get<string>('VAPID_PRIVATE_KEY')
        );
    }

    async saveSubscription(userId: string, subscription: SubscriptionDto) {
        console.log(subscription)
        try {
            await this.notificationModel.findOneAndUpdate(
                { userId, 'subscription.endpoint': subscription.endpoint },
                {
                    userId,
                    subscription,
                    updatedAt: new Date()
                },
                { upsert: true }
            );
        } catch (error) {
            throw new HttpException('구독 정보 저장 실패: ' + error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async removeSubscription(userId: string) {
        try {
            await this.notificationModel.deleteMany({
                userId
            });
        } catch (error) {
            throw new HttpException('구독 정보 제거 실패', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async sendNotification(userId: string, notification: NotificationDto) {
        try {
            const subscriptionDocs = await this.notificationModel.find({
                userId
            });

            if (!subscriptionDocs.length) {
                throw new NotFoundException('구독 정보를 찾을 수 없습니다.');
            }

            const payload = {
                title: notification.title,
                body: notification.body,
                icon: notification.icon,
                badge: notification.badge,
                url: notification.url,
                actions: notification.actions || [],
                timestamp: new Date().getTime()
            };

            const results = await Promise.all(
                subscriptionDocs.map(async (doc) => {
                    try {
                        return await webpush.sendNotification(
                            doc.subscription,
                            JSON.stringify(payload)
                        );
                    } catch (error) {
                        if (error.statusCode === 410) {
                            await this.removeSubscription(userId);
                            console.log('구독이 만료되었습니다.', HttpStatus.GONE);
                        }
                        throw error;
                    }
                })
            );

            // await this.saveNotificationHistory(userId, notification);

            return results;
        } catch (error) {
            console.log('알림 전송 실패' + error, HttpStatus.INTERNAL_SERVER_ERROR);
            throw error;
        }
    }

    async sendNotificationToMany(userIds: string[], notification: NotificationDto) {
        const promises = userIds.map(userId =>
            this.sendNotification(userId, notification).catch(error => {
                console.error(`Failed to send notification to user ${userId}:`, error);
                return null;
            })
        );

        await Promise.all(promises);
    }

    private async saveNotificationHistory(userId: string, notification: NotificationDto) {
        try {
            await this.notificationModel.findOneAndUpdate(
                { userId },
                {
                    $push: {
                        history: {
                            ...notification,
                            sentAt: new Date()
                        }
                    }
                }
            );
        } catch (error) {
            console.error('알림 기록 저장 실패:', error);
        }
    }

    async getNotificationSettings(userId: string, endpoint?: string) {
        try {
            if (endpoint && endpoint !== 'undefined') {
                const settings = await this.notificationModel.findOne({
                    userId,
                    'subscription.endpoint': endpoint
                });
                return settings;
            }

            const settings = await this.notificationModel.find({
                userId
            });

            if (!settings || settings.length === 0) {
                return { message: '!settings' };
            }

            return settings;
        } catch (error) {
            throw new HttpException(
                '알림 설정 조회 실패: ' + error,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
