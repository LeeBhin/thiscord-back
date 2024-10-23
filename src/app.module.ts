import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FriendsModule } from './friends/friends.module';
import { ChatModule } from './chat/chat.module';
import { Neo4jModule } from './neo4j/neo4j.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    UserModule,
    FriendsModule,
    ChatModule,
    Neo4jModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }