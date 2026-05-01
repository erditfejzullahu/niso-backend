import { Controller, Delete, Get, Param, Patch, Query, Req } from '@nestjs/common';
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
    async getNotifications(
        @Req() req: Request,
        @Query('cursor') cursor?: string,
        @Query('limit') limitRaw?: string,
    ) {
        const user = req.user as User;
        const parsed = limitRaw != null ? Number.parseInt(limitRaw, 10) : NaN;
        const limit = Number.isFinite(parsed) ? parsed : 20;
        return await this.notificationService.getUserNotifications(user.id, {
            cursorId: cursor,
            limit,
        });
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('unread-count')
    async getUnreadNotificationsCount(@Req() req: Request) {
        const user = req.user as User;
        return await this.notificationService.getUnreadNotificationsCount(user.id);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Patch('read-notifications')
    async makeReadNotifications(@Req() req: Request){
        const user = req.user as User;
        return await this.notificationService.makeReadNotifications(user.id)
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('get-notification-connected-ride/:id')
    async getNotificationConnectedRide(@Req() req: Request, @Param('id') id: string){
        const user = req.user as User;
        return await this.notificationService.getNotificationConnectedRide(user, id);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('get-notification-ride-request/:id')
    async getNotificationRideRequest(@Req() req: Request, @Param('id') id: string){
        const user = req.user as User;
        return await this.notificationService.getNotificationRideRequest(user, id);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Delete('delete-notification/:id')
    async deleteNotification(@Req() req: Request, @Param('id') notificationId: string){
        const user = req.user as User;
        return await this.notificationService.deleteNotification(user.id, notificationId)
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('notification/:id')
    async getNotificationById(@Req() req: Request, @Param('id') notificationId: string){
        const user = req.user as User;
        return await this.notificationService.getNotificationById(user.id, notificationId)
    }

}
