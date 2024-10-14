import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PushService } from './push.service';
import { ConfigService } from '@nestjs/config';
import { PushSubscriptionSchema } from 'src/schemas/push.schema';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'PushSubscription', schema: PushSubscriptionSchema }]),
        UserModule
    ],
    providers: [PushService, ConfigService],
    exports: [PushService],
})
export class PushModule { }
