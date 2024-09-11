import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) { }

    // 토큰 검증 및 userId 추출
    verifyToken(token: string): string {
        try {
            const decoded = this.jwtService.verify<JwtPayload>(token, {
                secret: process.env.JWT_SECRET,
            });
            return decoded.userId;
        } catch (err) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
