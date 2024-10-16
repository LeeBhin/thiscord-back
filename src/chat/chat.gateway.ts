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

    constructor(
        private readonly chatService: ChatService,
        private readonly userService: UserService,
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
        @MessageBody() data: { receivedUser: string; message: string },
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const cookie = client.handshake.headers.cookie;
        const token = this.getCookieValue(cookie, 'jwtToken');

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }


        const decoded = this.userService.verifyToken(token);
        const senderId = decoded.userId;

        const sender = await this.userService.findById(senderId);
        const senderName = sender.name;

        const { receivedUser, message } = data;

        const receiver = await this.userService.findByName(receivedUser);
        if (!receiver) {
            throw new NotFoundException('Receiver not found');
        }
        const receiverId = receiver.userId;

        let chatRoom = await this.chatService.findChatRoomByParticipants(senderId, receiverId);

        await this.chatService.saveMessage(chatRoom._id.toString(), senderName, message);

        chatRoom.participants.forEach((participantId) => {
            const receiverSocketId = this.getReceiverSocketId(participantId);
            if (receiverSocketId) {
                this.server.to(receiverSocketId).emit('message', {
                    message,
                    senderId: senderName,
                    receiverId,
                });
            }
        });
    }

    @SubscribeMessage('delete')
    async handleDelete(
        @MessageBody() data: { receivedUser: string; },
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const cookie = client.handshake.headers.cookie;
        const token = this.getCookieValue(cookie, 'jwtToken');

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const senderId = decoded.userId;

        const sender = await this.userService.findById(senderId);
        const senderName = sender.name;

        const { receivedUser } = data;

        const receiver = await this.userService.findByName(receivedUser);
        if (!receiver) {
            throw new NotFoundException('Receiver not found');
        }
        const receiverId = receiver.userId;

        let chatRoom = await this.chatService.findChatRoomByParticipants(senderId, receiverId);

        chatRoom.participants.forEach((participantId) => {
            const receiverSocketId = this.getReceiverSocketId(participantId);
            if (receiverSocketId) {
                this.server.to(receiverSocketId).emit('delete', {
                });
            }
        });
    }

    @SubscribeMessage('friendReq')
    async handleFriendRequest(@MessageBody() data: { senderId: string }) {
        this.server.emit('friendRes', {
        });
    }
}