import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
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
    @Put('accept/:userid/:friendid')
    async acceptRequest(@Param('userid') userid: string, @Param('friendid') friendid: string) {
        return this.friendsService.acceptRequest(userid, friendid);
    }

    // 삭제
    @Delete('delete/:userid/:friendid')
    async deleteFriend(@Param('userid') userid: string, @Param('friendid') friendid: string) {
        return this.friendsService.deleteFriend(userid, friendid);
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
