import { Module } from '@nestjs/common';
import { RideController } from './rides.controller';
import { RideService } from './rides.service';
import { ConversationsModule } from 'src/conversations/conversations.module';
@Module({
  imports: [ConversationsModule],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService]
})
export class RideModule {}
