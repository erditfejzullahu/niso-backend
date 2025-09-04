import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RideModule } from './rides/rides.module';
import { DriversModule } from './drivers/drivers.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import {ConfigModule} from "@nestjs/config"
import { APP_GUARD } from '@nestjs/core';
import { JwtAuth } from 'common/guards/jwt.guard';
import { RolesGuard } from 'common/guards/roles.guards';
import { UploadModule } from './upload/upload.module';
import { ConversationsController } from './conversations/conversations.controller';
import { ConversationsModule } from './conversations/conversations.module';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { FinancesModule } from './finances/finances.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    RideModule, 
    DriversModule, 
    PrismaModule, 
    AuthModule,
    ConfigModule.forRoot({envFilePath: '.env', isGlobal: true}),
    UploadModule,
    ConversationsModule,
    NotificationsModule,
    FinancesModule,
    ReviewsModule
  ],
  controllers: [AppController, ConversationsController, NotificationsController],
  providers: [AppService, {provide: APP_GUARD, useClass: JwtAuth}, {provide: APP_GUARD, useClass: RolesGuard}],
})
export class AppModule {}
