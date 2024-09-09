import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb+srv://22a617h0659:7rxsDnN93U09vAVx@cluster0.ucfa7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'),
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    })
  ],
  controllers: [AppController, UserController],
  providers: [AppService],
})
export class AppModule { }

