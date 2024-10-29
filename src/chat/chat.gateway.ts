import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UserService } from 'src/user/user.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import mongoose from 'mongoose';
import { NotificationService } from 'src/notification/notofication.service';

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:3000', 'https://smcthiscord.netlify.app'],
        credentials: true,
    },
    transport: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private clients: { [userId: string]: string } = {};
    private clientsCurrnet: { [userid: string]: string } = {};

    constructor(
        private readonly chatService: ChatService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
    ) { }

    private getCookieValue(cookie: string, key: string): string | null {
        if (!cookie) return null;
        const match = cookie.match(new RegExp(`(^| )${key}=([^;]+)`));
        return match ? match[2] : null;
    }

    handleConnection(client: Socket): void {
        try {
            const cookie = client.handshake.headers.cookie;
            const token = this.getCookieValue(cookie, 'jwtToken');

            if (!token) {
                throw new UnauthorizedException('No token provided');
            }

            const decoded = this.userService.verifyToken(token);
            const userId = decoded.userId;

            if (userId) {
                this.clients[userId] = client.id;
            }
        } catch (error) {
            console.error(`Connection error: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket): void {
        const userId = Object.keys(this.clients).find(
            (key) => this.clients[key] === client.id,
        );
        if (userId) {
            delete this.clients[userId];
        }
    }

    private getReceiverSocketId(receiverId: string): string | undefined {
        return this.clients[receiverId];
    }

    @SubscribeMessage('message')
    async handleMessage(
        @MessageBody() data: { receivedUser: string; message: string; timestamp: string },
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const { senderId, receiverId } = await this.getUserIds(client, data.receivedUser);

        let chatRoom = await this.chatService.findChatRoomByParticipants(senderId, receiverId);

        const messageId = new mongoose.Types.ObjectId();

        await this.chatService.saveMessage(chatRoom._id.toString(), senderId, receiverId, data.message, messageId);

        this.emitToParticipants(chatRoom.participants, 'message', {
            receiverId,
            message: data.message,
            senderId,
            timestamp: data.timestamp,
            isRead: {
                [senderId]: true,
                [receiverId]: false
            },
            _id: messageId,
            senderName: (await this.userService.findById(senderId)).name,
            receiverName: (await this.userService.findById(receiverId)).name,
        });

        if (this.clientsCurrnet[receiverId] === (await this.userService.findById(senderId)).name) return;

        try {
            const notificationSettings = await this.notificationService.getNotificationSettings(receiverId);

            if (notificationSettings) {
                const sender = await this.userService.findById(senderId);
                const senderName = sender.name || '알 수 없는 사용자';

                await this.notificationService.sendNotification(receiverId, {
                    title: senderName,
                    body: `${data.message.length > 50 ? data.message.substring(0, 47) + '...' : data.message}`,
                    badge: `images/colorIcon.png`,
                    icon: (await this.userService.findById(senderId)).iconColor,
                    url: `/channels/me/@${(await this.userService.findById(senderId)).name}`,
                });

            }
        } catch (error) {
            console.error('Push notification failed:', error);
        }
    }

    @SubscribeMessage('current')
    async handleCurrent(
        @MessageBody() data: { userId: string; current: string; },
    ): Promise<void> {
        this.clientsCurrnet[data.userId] = data.current;
    }

    @SubscribeMessage('delete')
    async handleDelete(
        @MessageBody() data: { receivedUser: string; msgId: string; },
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const { senderId, receiverId } = await this.getUserIds(client, data.receivedUser);

        let chatRoom = await this.chatService.findChatRoomByParticipants(senderId, receiverId);
        this.emitToParticipants(chatRoom.participants, 'delete', { msgId: data.msgId });
    }

    @SubscribeMessage('edit')
    async handleEdit(
        @MessageBody() data: { receivedUser: string; msgId: string; message: string; },
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const { senderId, receiverId } = await this.getUserIds(client, data.receivedUser);

        let chatRoom = await this.chatService.findChatRoomByParticipants(senderId, receiverId);
        this.emitToParticipants(chatRoom.participants, 'edit', {
            msgId: data.msgId,
            message: data.message
        });
    }

    private async getUserIds(client: Socket, receivedUser: string) {
        const token = this.getTokenFromCookie(client);
        const decoded = this.userService.verifyToken(token);
        const senderId = decoded.userId;

        const receiver = await this.userService.findByName(receivedUser);
        if (!receiver) {
            throw new NotFoundException('Receiver not found');
        }
        const receiverId = receiver.userId;

        return { senderId, receiverId };
    }

    private getTokenFromCookie(client: Socket): string {
        const cookie = client.handshake.headers.cookie;
        const token = this.getCookieValue(cookie, 'jwtToken');
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }
        return token;
    }

    private emitToParticipants(participants: string[], event: string, data: any) {
        participants.forEach((participantId) => {
            const receiverSocketId = this.getReceiverSocketId(participantId);
            if (receiverSocketId) {
                this.server.to(receiverSocketId).emit(event, data);
            }
        });
    }

    @SubscribeMessage('friendReq')
    async handleFriendRequest(@MessageBody() data: { senderId: string }) {
        this.server.emit('friendRes', {
        });
    }
}