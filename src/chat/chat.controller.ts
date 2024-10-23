import { Body, Controller, Delete, Get, Patch, Request, Query, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Request as ExpressRequest } from 'express';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('history')
    async getChatHistory(
        @Request() req: ExpressRequest,
        @Body() body: {
            receiverName: string;
            lastReadMsgId?: string;
            direction?: string;
            pageSize?: number;
        },
    ) {
        return await this.chatService.getChatHistory(req, body.receiverName, body.lastReadMsgId, body.direction, body.pageSize);
    }

    @Get('chatrooms')
    async getMyChatrooms(
        @Request() req: ExpressRequest,
    ) {
        return await this.chatService.getMyChatrooms(req);
    }

    @Delete('delete')
    async deleteMsg(
        @Request() req: ExpressRequest,
        @Body() body: { msgId: string, senderId: string, receiverName: string }
    ) {
        const { msgId, senderId, receiverName } = body;
        return await this.chatService.deleteMsg(req, msgId, senderId, receiverName);
    }

    @Patch('edit')
    async editMsg(
        @Request() req: ExpressRequest,
        @Body() body: { msgId: string, senderId: string, receiverName: string, newMsg: string }
    ) {
        const { msgId, senderId, receiverName, newMsg } = body;
        return await this.chatService.editMsg(req, msgId, senderId, receiverName, newMsg);
    }

    @Patch('messages/read')
    async markMessageAsRead(
        @Request() req: ExpressRequest,
        @Body() body: { msgId: string, receiverName: string }
    ) {
        const { msgId, receiverName } = body;
        return this.chatService.readMessage(req, msgId, receiverName);
    }
}
