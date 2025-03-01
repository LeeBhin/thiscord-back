import { Controller, Get, Post, Body, Param, Req, Res, HttpStatus, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { Request, Response } from 'express';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    // 모든 user
    @Get()
    async findAll() {
        return this.userService.findAll();
    }

    // // 특정 user id
    // @Get(':id')
    // async findOne(@Param('id') id: string) {
    //     return this.userService.findOne(id);
    // }

    // user 생성
    @Post('register')
    async create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    // 로그인
    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res() res: Response) {
        const { userInfo, token } = await this.userService.validateUser(loginDto.phoneOrEmail, loginDto.password);

        res.cookie('jwtToken', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        return res.json({ userInfo });
    }

    // 로그아웃
    @Post('logout')
    async logout(@Res() res: Response) {
        res.cookie('jwtToken', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 0,
            path: '/'
        });

        return res.status(HttpStatus.OK).json({ message: '로그아웃되었습니다.' });
    }

    @Get('myinfo')
    async getMyInfo(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies['jwtToken'];
        if (!token) {
            console.log('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;


        const userInfo = await this.userService.myInfo(userId);
        return res.json({
            name: userInfo.name,
            iconColor: userInfo.iconColor,
            userId
        });
    }

    @Patch('update-name')
    async updateUserName(@Req() req: Request, @Body() body: { newName: string }) {
        const token = req.cookies['jwtToken'];
        if (!token) {
            console.log('No token provided');
        }

        const decoded = this.userService.verifyToken(token);
        const userId = decoded.userId;

        const { newName } = body;
        const updatedUser = await this.userService.updateUserName(userId, newName);

        return {
            updatedUser,
        };
    }

    @Patch('/delete/delete-user')
    async deleteUser(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies['jwtToken'];
        if (!token) {
            console.log('No token provided');
        }

        const { password } = req.body;

        try {
            const decoded = this.userService.verifyToken(token);
            const userId = decoded.userId;

            const isPasswordValid = await this.userService.validatePassword(userId, password);
            if (!isPasswordValid) {
                return res.status(403).json({ message: 'Invalid password' });
            }

            const deletedUserName = await this.userService.deleteUser(userId);
            return res.status(200).json({ message: `User deleted` });
        } catch (error) {
            return res.status(500).json({ message: error });
        }
    }

    @Post('check-token')
    async checkToken(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies['jwtToken'];

        if (!token) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No token found' });
        }

        try {
            this.userService.verifyToken(token);
            return res.status(HttpStatus.OK).json({ message: 'Token is valid' });
        } catch (error) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
        }
    }
}