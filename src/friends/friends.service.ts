import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFriendDto } from 'src/dto/create-friend.dto';
import { Friend } from 'src/interfaces/friend.interface';

@Injectable()
export class FriendsService {
    constructor(
        @InjectModel('Friend') private readonly friendModel: Model<Friend>,
        private readonly jwtService: JwtService,
    ) { }

    // 친구 요청
    async sendRequest(createFriendDto: CreateFriendDto): Promise<any> {
        
    }

    // 요청 수락
    async acceptRequest(userid: string, friendid: string): Promise<any> {
    }

    // 삭제
    async deleteFriend(userid: string, friendid: string): Promise<void> {
    }

    // 친구 조회
    async getFriends(userid: string): Promise<any[]> {
        try {
            const friendDocument = await this.friendModel.findOne({ userid }).exec();

            if (!friendDocument) {
                throw new NotFoundException('User not found');
            }
            return friendDocument.friends;
            
        } catch (err) {
            console.error(err);
            throw new NotFoundException('Error retrieving friends');
        }
    }
}
