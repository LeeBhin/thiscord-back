import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { JwtModule } from '@nestjs/jwt';
import { FriendSchema } from 'src/schemas/friend.schema';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Friend', schema: FriendSchema }]),  // 필요한 Mongoose 설정
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '7d' },
        }),
        UserModule
    ],
    providers: [FriendsService],
    controllers: [FriendsController],
})
export class FriendsModule { }
