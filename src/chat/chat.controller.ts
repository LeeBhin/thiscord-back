import { Body, Controller, Delete, Get, Param, Patch, Req } from '@nestjs/common';
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

    @Delete('delete')
    async deleteMsg(@Req() req: Request, @Body() body: { msgId: string, senderId: string, receiverName: string }) {
        const { msgId, senderId, receiverName } = body;
        return await this.chatService.deleteMsg(req, msgId, senderId, receiverName);
    }

    @Patch('edit')
    async editMsg(
        @Req() req: Request,
        @Body() body: { msgId: string, senderId: string, receiverName: string, newMsg: string }
    ) {
        const { msgId, senderId, receiverName, newMsg } = body;
        return await this.chatService.editMsg(req, msgId, senderId, receiverName, newMsg);
    }
}
