import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { UserModule } from 'src/user/user.module';
import { ChatRoom, ChatRoomSchema } from 'src/schemas/chatRoom.schema';
import { ChatController } from './chat.controller';
import { PushModule } from 'src/push/push.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: ChatRoom.name, schema: ChatRoomSchema }]),
        UserModule,
        PushModule
    ],
    providers: [ChatGateway, ChatService],
    controllers: [ChatController],
})
export class ChatModule { }
