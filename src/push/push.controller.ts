import { Controller, Post, Body, Req } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
    constructor(private pushService: PushService) { }

    @Post('subscribe')
    async subscribe(@Body() subscription: any, @Req() req: any) { 
        const savedSubscription = await this.pushService.saveSubscription(subscription, req);
        return { success: true, data: savedSubscription };
    }
}