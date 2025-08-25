import { Controller, Delete, Get, Param, Patch, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Roles } from 'common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import type { Request } from 'express';

@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationService: NotificationsService
    ){}

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('get-notifications')
    async getNotifications(@Req() req: Request){
        const user = req.user as User;
        return await this.notificationService.getUserNotifications(user.id)
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Patch('read-notifications')
    async makeReadNotifications(@Req() req: Request){
        const user = req.user as User;
        return await this.notificationService.makeReadNotifications(user.id)
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Delete('delete-notification/:id')
    async deleteNotification(@Req() req: Request, @Param('id') notificationId: string){
        const user = req.user as User;
        return await this.notificationService.deleteNotification(user.id, notificationId)
    }



}
