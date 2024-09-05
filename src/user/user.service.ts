import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    // 모든 user 조회
    async findAll(): Promise<User[]> {
        return this.userModel.find().exec();
    }

    // 특정 user 조회
    async findOne(id: string): Promise<User> {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }
        return user;
    }

    // 새로운 user 생성
    async create(createUserDto: CreateUserDto): Promise<User> {
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const newUser = new this.userModel({
            ...createUserDto,
            userId: uuidv4(),
            password: hashedPassword,
        });
        return newUser.save();
    }

    // 사용자 인증
    async validateUser(phoneOrEmail: string, password: string): Promise<User | null> {
        const user = await this.userModel.findOne({ phoneOrEmail }).exec();
        if (user && await bcrypt.compare(password, user.password)) {
            return user;
        }
        return null;
    }
}
