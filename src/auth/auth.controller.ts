import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from '../user/user.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly userService: UserService) { }

    @Get('check-token')
    async checkToken(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies['jwtToken'];
        console.log('Received token:', token);

        if (!token) {
            console.log('No token found');
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No token found' });
        }

        try {
            this.userService.verifyToken(token);
            return res.status(HttpStatus.OK).json({ message: 'Token is valid' });
        } catch (error) {
            console.log('Token verification failed:', error.message);
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
        }
    }
}