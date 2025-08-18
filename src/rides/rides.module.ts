import { Module } from '@nestjs/common';
import { RideController } from './rides.controller';
import { RideService } from './rides.service';

@Module({
  controllers: [RideController],
  providers: [RideService]
})
export class RideModule {}
