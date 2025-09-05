import { Module } from '@nestjs/common';
import { PassengersService } from './passengers.service';
import { PassengersController } from './passengers.controller';

@Module({
  providers: [PassengersService],
  controllers: [PassengersController]
})
export class PassengersModule {}
