import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

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
    @Post('create')
    async create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    // 로그인
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.userService.validateUser(loginDto.phoneOrEmail, loginDto.password);
    }
}