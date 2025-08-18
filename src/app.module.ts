import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { RideModule } from './rides/rides.module';
import { DriversModule } from './drivers/drivers.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import {ConfigModule} from "@nestjs/config"
import { APP_GUARD } from '@nestjs/core';
import { JwtAuth } from 'common/guards/jwt.guard';
import { RolesGuard } from 'common/guards/roles.guards';

@Module({
  imports: [UsersModule,
    RideModule, 
    DriversModule, 
    PrismaModule, 
    AuthModule,
    ConfigModule.forRoot({envFilePath: '.env', isGlobal: true})
  ],
  controllers: [AppController],
  providers: [AppService, {provide: APP_GUARD, useClass: JwtAuth}, {provide: APP_GUARD, useClass: RolesGuard}],
})
export class AppModule {}
