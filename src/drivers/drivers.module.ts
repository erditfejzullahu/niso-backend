import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports :[DriversService]
})
export class DriversModule {}
