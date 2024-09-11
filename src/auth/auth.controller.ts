import { Controller, Get, Req, Res, HttpStatus, Post } from '@nestjs/common';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

@Controller('auth')
export class AuthController {

    // 토큰 검증
    verifyToken(token: string): void {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error(err);
        }
    }

    @Post('check-token')
    async checkToken(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies['jwtToken'];

        if (!token) {
            console.log('No token found');
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No token found' });
        }

        try {
            this.verifyToken(token);
            return res.status(HttpStatus.OK).json({ message: 'Token is valid' });
        } catch (error) {
            console.log('Token verification failed:', error.message);
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
        }
    }
}