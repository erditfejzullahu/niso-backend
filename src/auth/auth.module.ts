import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RefreshStrategy } from './refresh.strategy';
import { JwtModule } from '@nestjs/jwt';
import {ConfigModule, ConfigService} from "@nestjs/config";
import { PrismaModule } from 'src/prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { UploadModule } from 'src/upload/upload.module';
import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  imports: [
    UploadModule,
    PassportModule,
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>("JWT_ACCESS_EXPIRATION")
        }
      }),
      inject: [ConfigService]
    }),
    forwardRef(() => ConversationsModule)
  ],
  exports: [AuthService]
})
export class AuthModule {}
