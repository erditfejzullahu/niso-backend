import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Roles } from 'common/decorators/roles.decorator';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationsService } from './conversations.service';
import { InitiateSupportTicketDto } from './dto/initiateSupportTicket.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('conversations')
export class ConversationsController {
    constructor(
        private readonly conversationsService: ConversationsService
    ){}

    @Roles(Role.PASSENGER, Role.ADMIN)
    @Post('initiate-support-ticket')
    @UseInterceptors(FileFieldsInterceptor([
        {name: 'evidences', maxCount: 5}
    ]))
    async initiateSupportTicket(
        @Req() req: Request,
        @Body() body: InitiateSupportTicketDto,
        @UploadedFiles() files: {
            evidences: Express.Multer.File[]
        }
    ){
        const user = req.user as User;
        if(files.evidences && files.evidences.length > 5) throw new BadRequestException("Nuk jeni te lejuar te ngarkoni me shume se 5 imazhe.");
        files.evidences.map((file) => {
            if(!file.mimetype.startsWith('image/')) throw new BadRequestException("Vetem imazhe jane te lejuara.");
            if(file.size > 10 * 1024 * 1024) throw new BadRequestException("Fajlli duhet te jete maksimum 10MB.");
        })
        return await this.conversationsService.initiateSupportTicket(user, body, files);
    }

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
