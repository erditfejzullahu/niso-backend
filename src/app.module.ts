import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { JourneyModule } from './journey/journey.module';
import { DriversModule } from './drivers/drivers.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [UsersModule, JourneyModule, DriversModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
