import { Controller, Post, Body, Param, Get, Put, UseGuards, Request, UnauthorizedException, Req } from '@nestjs/common';
import { NotificationService } from './notofication.service';
import { SubscriptionDto } from '../dto/notification.dto';
import { UserService } from 'src/user/user.service';

@Controller('notifications')
export class NotificationController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly userService: UserService
    ) { }

    @Post('subscribe')
    async subscribe(@Req() req, @Body() { subscription }: { subscription: SubscriptionDto }) {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        await this.notificationService.saveSubscription(userId, subscription);
        return {
            success: true,
            message: '푸시 알림 구독이 완료되었습니다.'
        };
    }

    @Post('unsubscribe')
    async unsubscribe(@Request() req) {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        await this.notificationService.removeSubscription(userId);
        return {
            success: true,
            message: '푸시 알림 구독이 해제되었습니다.'
        };
    }

    @Get('settings')
    async getSettings(@Request() req) {
        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        const settings = await this.notificationService.getNotificationSettings(
            userId
        );
        if (settings)
            return { settings }
    }

}
