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
import { UploadService } from './upload/upload.service';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    RideModule, 
    DriversModule, 
    PrismaModule, 
    AuthModule,
    ConfigModule.forRoot({envFilePath: '.env', isGlobal: true}),
    UploadModule
  ],
  controllers: [AppController],
  providers: [AppService, {provide: APP_GUARD, useClass: JwtAuth}, {provide: APP_GUARD, useClass: RolesGuard}, UploadService],
})
export class AppModule {}
