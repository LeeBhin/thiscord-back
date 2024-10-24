import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { FriendSchema } from 'src/schemas/friend.schema';
import { UserModule } from 'src/user/user.module';
import { ChatRoom, ChatRoomSchema } from 'src/schemas/chatRoom.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Friend', schema: FriendSchema },
        { name: ChatRoom.name, schema: ChatRoomSchema },]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '7d' },
        }),
        forwardRef(() => UserModule),
    ],
    providers: [FriendsService],
    controllers: [FriendsController],
    exports: [FriendsService, MongooseModule],
})
export class FriendsModule { }
