import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
    imports: [ConversationsModule],
    providers: [NotificationsService],
    controllers: [NotificationsController],
    exports: [NotificationsService]
})
export class NotificationsModule {}
