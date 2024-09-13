import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { FriendSchema } from 'src/schemas/friend.schema';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Friend', schema: FriendSchema }]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '7d' },
        }),
        forwardRef(() => UserModule),  // 순환 의존성 문제 해결
    ],
    providers: [FriendsService],
    controllers: [FriendsController],
    exports: [FriendsService],
})
export class FriendsModule {}
