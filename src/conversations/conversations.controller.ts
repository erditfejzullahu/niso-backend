import { Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Roles } from 'common/decorators/roles.decorator';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
    constructor(
        private readonly conversationsService: ConversationsService
    ){}

    @Roles(Role.PASSENGER)
    @Get('get-conversations-passenger')
    async getAllConversationsByPassenger(@Req() req: Request){
        const user = req.user as User;
        return await this.conversationsService.getAllConversationsByPassenger(user.id);
    }

    @Roles(Role.DRIVER)
    @Get('get-active-conversations-driver')
    async getAllActiveConversationsByPassenger(@Req() req: Request){
        const user = req.user as User;
        return await this.conversationsService.getAllActiveConversationsByDriver(user.id);
    }

    @Roles(Role.PASSENGER)
    @Patch('finish-conversation/:id')
    async finishConversationByPassenger(@Req() req: Request, @Param('id') rideRequestId: string){
        const user = req.user as User;
        return await this.conversationsService.finishConversationByPassenger(user.id, rideRequestId);
    }

    //only if conversation exists
    @Roles(Role.PASSENGER)
    @Patch('contact-driver-other/:id')
    async contactDriverForDifferentReason(@Req() req: Request, @Param("id") conversationId: string){
        const user = req.user as User;
        return await this.conversationsService.contactDriverForDifferentReason(user.id, conversationId);
    }

    @Roles(Role.DRIVER)
    @Get('contact-passenger-allowance/:id')
    async getIntoConversationWithPassenger(@Req() req: Request, @Param("id") conversationId: string){
        const user = req.user as User;
        return await this.conversationsService.getIntoConversationWithPassenger(user.id, conversationId);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('get-messages/:id')
    async getAllMessagesByConversationId(@Req() req: Request, @Param('id') conversationId: string){
        const user = req.user as User;
        return await this.conversationsService.getAllMessagesByConversationId(user.id, conversationId);
    }
}
