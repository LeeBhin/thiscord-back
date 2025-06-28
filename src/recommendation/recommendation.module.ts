import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationService } from './recommendation.service';
import { FriendSchema } from '../schemas/friend.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Friend', schema: FriendSchema }]),
    UserModule,
  ],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}