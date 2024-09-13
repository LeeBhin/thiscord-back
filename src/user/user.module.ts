import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserSchema } from '../schemas/user.schema';
import { FriendsModule } from 'src/friends/friends.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    JwtModule,
    forwardRef(() => FriendsModule),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, MongooseModule],
})
export class UserModule { }
