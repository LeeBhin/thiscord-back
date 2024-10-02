import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatMessage, ChatMessageSchema } from '../schemas/chat.schema';
import { UserModule } from 'src/user/user.module';
import { ChatRoom, ChatRoomSchema } from 'src/schemas/chatRoom.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: ChatMessage.name, schema: ChatMessageSchema },
        { name: ChatRoom.name, schema: ChatRoomSchema }
        ]),
        UserModule
    ],
    providers: [ChatGateway, ChatService],
})
export class ChatModule { }
