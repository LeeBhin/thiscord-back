import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { FriendsService } from 'src/friends/friends.service';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
        private readonly friendsService: FriendsService,
    ) { }

    async findByName(name: string): Promise<User | null> {
        return this.userModel.findOne({ name }).select('userId name iconColor').lean().exec();
    }

    async findById(userId: string): Promise<User | null> {
        const user = await this.userModel.findOne({ userId: userId }).select('userId name iconColor').lean().exec();
        if (!user) {
            throw new NotFoundException(`User not found`);
        }
        return user;
    }

    // 배치로 사용자 조회 (성능 최적화)
    async findUsersByIds(userIds: string[]): Promise<User[]> {
        return this.userModel
            .find({ userId: { $in: userIds } })
            .select('userId name iconColor')
            .lean()
            .exec();
    }

    // 모든 user 조회
    async findAll(): Promise<User[]> {
        return this.userModel.find().select('userId name iconColor').lean().exec();
    }

    // 특정 user 조회
    async findOne(id: string): Promise<User | null> {
        return this.userModel.findOne({ userId: id }).select('userId name iconColor').lean().exec();
    }

    // 새로운 user 생성
    async create(createUserDto: CreateUserDto): Promise<User> {
        const colors = [
            '#B9BBBE',
            '#5865F2',
            '#EB459E',
            '#ED4245',
            '#FEE75C',
            '#57F287',
            '#9B59B6'
        ];

        const existingMail = await this.userModel.findOne({ phoneOrEmail: createUserDto.phoneOrEmail }).lean().exec();
        if (existingMail) {
            throw new ConflictException('이미 가입된 휴대폰 번호 또는 이메일입니다.');
        }

        const existingName = await this.userModel.findOne({ name: new RegExp(`^${createUserDto.name}$`, 'i') }).lean().exec();
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

        const savedUser = await newUser.save();

        // Friend 문서 생성
        await this.friendsService.createFriendDocument(savedUser.userId, createUserDto.name);

        return savedUser;
    }

    // 사용자 인증
    async validateUser(phoneOrEmail: string, password: string): Promise<{ userInfo: { name: string, iconColor: string }, token: string } | null> {
        const user = await this.userModel.findOne({ phoneOrEmail }).exec();
        if (!user) {
            throw new ConflictException('로그인 정보가 일치하지 않습니다.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ConflictException('로그인 정보가 일치하지 않습니다.');
        }

        if (user.fcmToken === 'deletedUser') {
            throw new ConflictException('로그인 정보가 일치하지 않습니다.');
        }

        const payload = {
            username: user.name,
            iconColor: user.iconColor,
            userId: user.userId
        };

        const token = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: '7d',
        });

        const userInfo = {
            name: user.name,
            iconColor: user.iconColor
        }

        return { userInfo, token };
    }

    async updateUserName(userId: string, newName: string): Promise<any> {
        const existingName = await this.userModel.findOne({ name: new RegExp(`^${newName}$`, 'i') }).lean().exec();
        if (existingName) {
            return '이미 사용중인 이름입니다.'
        }

        const updatedUser = await this.userModel.findOneAndUpdate(
            { userId: userId },
            { name: newName },
            { new: true }
        ).exec();

        if (!updatedUser) {
            console.log('사용자를 찾을 수 없습니다.');
        }

        return updatedUser.name;
    }

    async myInfo(userId: string): Promise<{ name: string, iconColor: string } | null> {
        const user = await this.userModel.findOne({ userId }).select('name iconColor').lean().exec();

        if (!user) {
            console.log('user not found')
        }
        return user;
    }

    async deleteUser(userId: string): Promise<string> {
        const randomSuffix = crypto.randomBytes(3).toString('hex');
        const newName = `Deleted User ${randomSuffix}`;
        const timestamp = new Date().getTime();

        const user = await this.userModel.findOneAndUpdate(
            { userId },
            { 
                name: newName, 
                fcmToken: 'deletedUser', 
                phoneOrEmail: `deleted_${userId}_${randomSuffix}_${timestamp}_${newName}`, 
                password: '' 
            },
            { new: true }
        );

        if (!user) {
            throw new ConflictException('User not found');
        }

        return newName;
    }

    async validatePassword(userId: string, password: string): Promise<boolean> {
        const user = await this.userModel.findOne({ userId }).select('password').exec();
        if (!user) {
            throw new ConflictException('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        return isMatch;
    }

    verifyToken(token: string): any {
        try {
            const decoded = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
            return decoded
        } catch (err) {
            throw new ConflictException(err);
        }
    }
}