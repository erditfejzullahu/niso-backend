import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConversationsGateway } from 'src/conversations/conversations.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationGateway: ConversationsGateway
    ){}

    async getUserNotifications(userId: string){
        try {
            const notifications = await this.prisma.notification.findMany({
                where: {userId},
                include: {
                    user: {
                        select: {
                            id: true,
                            image: true,
                            fullName: true
                        }
                    }
                }
            })

            return notifications;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async deleteNotification(userId: string, notificationId: string){
        try {
            const notification = await this.prisma.notification.findUnique({where: {id: userId}});
            if(!notification) throw new NotFoundException("Njoftimi nuk u gjet");

            await this.prisma.notification.delete({where: {id: notification.id}});
            return {success: true}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async makeReadNotifications(userId: string){
        try {
            await this.prisma.notification.updateMany({where: {userId}, data: {read: true}})
            return {success: true}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }
}
