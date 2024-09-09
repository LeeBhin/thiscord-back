import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();
        const token = request.cookies['jwtToken'];

        if (!token) {
            throw new UnauthorizedException('토큰 없음');
        }

        try {
            const decoded = this.jwtService.verify(token);
            request.user = decoded; 
            return true;
        } catch (error) {
            throw new UnauthorizedException('유효하지 않은 토큰');
        }
    }
}