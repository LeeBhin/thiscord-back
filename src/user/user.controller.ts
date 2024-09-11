import { Controller, Get, Post, Body, Param, Req, Res, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    // 모든 user
    @Get()
    async findAll() {
        return this.userService.findAll();
    }

    // 특정 user id
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

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
            sameSite: 'lax',
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
            sameSite: 'lax',
            maxAge: 0,
            path: '/'
        });

        return res.status(HttpStatus.OK).json({ message: '로그아웃되었습니다.' });
    }
}