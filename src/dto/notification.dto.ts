export class SubscriptionDto {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export class NotificationDto {
    title: string;
    body: string;
    icon: string;
    badge: string;
    url?: string;
    actions?: Array<{
        action: string;
        title: string;
    }>;
}

export class SendToManyDto {
    userIds: string[];
    notification: NotificationDto;
}