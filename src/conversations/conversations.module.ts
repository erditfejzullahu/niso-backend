import { forwardRef, Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsGateway } from './conversations.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { UploadModule } from 'src/upload/upload.module';
import { ConversationsGatewayServices } from './conversations.gateway-services';

@Module({
    imports: [forwardRef(() => UploadModule), PrismaModule, forwardRef(() => AuthModule)],
    controllers: [ConversationsController],
    providers: [ConversationsService, ConversationsGateway, ConversationsGatewayServices],
    exports: [ConversationsGateway, ConversationsService, ConversationsGatewayServices]
})
export class ConversationsModule {}
