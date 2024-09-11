import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { FriendSchema } from '../schemas/friend.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: 'Friend', schema: FriendSchema }])],
    providers: [FriendsService],
    controllers: [FriendsController],
})
export class FriendsModule { }
