import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Request } from 'express';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('history/:receiverName')
    async getChatHistory(
        @Req() req: Request,
        @Param('receiverName') receiverName: string,
    ) {
        return await this.chatService.getChatHistory(req, receiverName);
    }

    @Get('chatrooms')
    async getMyChatrooms(
        @Req() req: Request,
    ) {
        return await this.chatService.getMyChatrooms(req);
    }
}
