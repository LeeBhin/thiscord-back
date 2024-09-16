import { HttpStatus, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'supertest';
import { FriendsService } from './friends.service';
import { UserService } from 'src/user/user.service';

@Controller('friends')
export class FriendsController {
    constructor(
        private readonly friendsService: FriendsService,
        private readonly userService: UserService,
    ) { }

    // 친구 요청
    @Post('request/:friend')
    async sendRequest(@Param('friend') friendName: string, @Req() req: Request) {

        const token = req.cookies['jwtToken'];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        return this.friendsService.sendRequest(userId, friendName);
    }

    // 요청 수락
    @Put('accept/:friend')
    async acceptRequest(@Req() req: Request, @Param('friend') friend: string) {
        const token = req.cookies['jwtToken'];

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        return this.friendsService.acceptRequest(userId, friend);
    }

    // 삭제
    @Delete('delete/:friend')
    async deleteFriend(@Req() req: Request, @Param('friend') friend: string) {
        const token = req.cookies['jwtToken'];

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        const result = await this.friendsService.deleteFriend(userId, friend);

        if (result) {
            return {
                statusCode: HttpStatus.OK,
                message: 'delete success',
            };
        } else {
            throw new UnauthorizedException('Friend not found');
        }
    }

    // 친구 조회
    @Get('list')
    async getFriends(@Req() req: Request) {
        const token = req.cookies['jwtToken'];

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        return this.friendsService.getFriends(userId);
    }

    // 대기 친구 조회
    @Get('pendinglist')
    async getPendingFriends(@Req() req: Request) {
        const token = req.cookies['jwtToken'];

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        return this.friendsService.getPendingFriends(userId);
    }
}
