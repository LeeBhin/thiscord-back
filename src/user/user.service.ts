import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

        const colors = [
            '#5865F2', '#57F287', '#EB459E', '#FEE75C', '#ED4245', '#7289DA', '#FFA500',
            '#23272A', '#99AAB5', '#2C2F33', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C',
            '#F39C12', '#C0392B', '#8E44AD', '#2ECC71', '#16A085', '#D35400', '#34495E',
            '#7F8C8D'
        ];

        const existingMail = await this.userModel.findOne({ phoneOrEmail: createUserDto.phoneOrEmail }).exec();
        if (existingMail) {
            throw new ConflictException('이미 가입된 휴대폰 번호 또는 이메일입니다.');
        }

        const existingName = await this.userModel.findOne({ name: new RegExp(`^${createUserDto.name}$`, 'i') }).exec();
        if (existingName) {
            throw new ConflictException('이미 가입된 이름입니다.');
        }

        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const newUser = new this.userModel({
            ...createUserDto,
            userId: uuidv4(),
            password: hashedPassword,
            iconColor: randomColor
        });
        return newUser.save();
    }

    // 사용자 인증
    async validateUser(phoneOrEmail: string, password: string): Promise<User | null> {
        const user = await this.userModel.findOne({ phoneOrEmail }).exec();
        if (!user) {
            throw new ConflictException('존재하지 않는 휴대폰 번호 또는 이메일입니다.');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ConflictException('비밀번호가 일치하지 않습니다.');
        }
        return user;
    }
}
