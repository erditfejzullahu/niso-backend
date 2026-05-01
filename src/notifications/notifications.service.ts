import { BadRequestException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { ConversationsGatewayServices } from 'src/conversations/conversations.gateway-services';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationGateway: ConversationsGatewayServices
    ){}

    async getNotificationById(userId: string, notificationId: string){
        try {
            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}});
            if(!notification) throw new NotFoundException("Njoftimi nuk u gjet.");
            if(notification.userId !== userId) throw new ForbiddenException("Ju nuk keni te drejte per kryerjen e ketij veprimi.");

            return notification;
        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    /** Cursor is the `id` of the last notification from the previous page (createdAt desc). */
    async getUserNotifications(
        userId: string,
        options?: { cursorId?: string; limit?: number },
    ) {
        try {
            const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
            const cursorId = options?.cursorId?.trim() || undefined;

            if (cursorId) {
                const cursorRow = await this.prisma.notification.findFirst({
                    where: { id: cursorId, userId },
                    select: { id: true },
                });
                if (!cursorRow) {
                    throw new BadRequestException('Kursor i pavlefshëm për faqosje.');
                }
            }

            const notifications = await this.prisma.notification.findMany({
                where: { userId },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: limit + 1,
                skip: cursorId ? 1 : 0,
                ...(cursorId ? { cursor: { id: cursorId } } : {}),
                include: {
                    user: {
                        select: {
                            id: true,
                            image: true,
                            fullName: true,
                        },
                    },
                },
            });

            const hasMore = notifications.length > limit;
            const data = hasMore ? notifications.slice(0, limit) : notifications;
            return { data, hasMore };
        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Dicka shkoi gabim ne server');
        }
    }

    async getUnreadNotificationsCount(userId: string) {
        try {
            const unread = await this.prisma.notification.count({
                where: {
                    AND: [{ userId }, { read: false }],
                },
            });
            return { count: unread };
        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException("Dicka shkoi gabim ne server");
        }
    }

    async getNotificationConnectedRide(user: User, notificationId: string){
        try {
            
            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}, select: {id: true, userId: true, metadata: true}})
            if(!notification || !notification.metadata) throw new NotFoundException("Nuk u gjet njoftimi.");
            const metadata: any = JSON.parse(notification.metadata as string);
            
            if(!metadata.navigateAction.connectedRide) throw new BadRequestException("Nuk ka te dhena te mjaftueshme.");

            if(user.role === "DRIVER"){
                const connectedRide = await this.prisma.connectedRide.findUnique({
                    where: {id: metadata.navigateAction.connectedRide},
                    select: {
                        id: true,
                        passenger: {
                            select: {
                                id: true,
                                image: true,
                                fullName: true
                            }
                        },
                        status: true,
                        rideRequest: {
                            select: {
                                id: true,
                                price: true,
                                distanceKm: true,
                                fromAddress: true,
                                toAddress: true,
                                isUrgent: true
                            }
                        }
                    }
                })
                return connectedRide;
            }else{
                const connectedRide = await this.prisma.connectedRide.findUnique({
                    where: {id: metadata.navigateAction.connectedRide},
                    select: {
                        id: true,
                        driver: {
                            select: {
                                id: true,
                                fullName: true,
                                image: true
                            }
                        },
                        status: true,
                        rideRequest: {
                            select: {
                                price: true,
                                toAddress: true,
                                fromAddress: true,
                                id: true,
                                distanceKm: true,
                                isUrgent: true
                            }
                        }
                    }
                })
                return connectedRide;
            }
        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async getNotificationRideRequest(user: User, notificationId: string){
        try {
            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}, select: {id: true, userId: true, metadata: true}})
            if(!notification || !notification.metadata) throw new NotFoundException("Nuk u gjet njoftimi.");
            const metadata: any = JSON.parse(notification.metadata as string);
            if(!metadata.navigateAction.rideRequest) throw new BadRequestException("Nuk ka te dhena te mjaftueshme.");

            if(user.role === "DRIVER"){
                const rideRequest = await this.prisma.rideRequest.findUnique({
                    where: {id: metadata.navigateAction.rideRequest},
                    select: {
                        id: true,
                        passenger: {
                            select: {
                                id: true,
                                image: true,
                                fullName: true
                            }
                        },
                        status: true,
                        price: true,
                        distanceKm: true,
                        fromAddress: true,
                        toAddress: true,
                        isUrgent: true
                    }
                })
                return rideRequest;
            }else{
                const rideRequest = await this.prisma.rideRequest.findUnique({
                    where: {id: metadata.navigateAction.rideRequest},
                    select: {
                        id: true,
                        driver: {
                            select: {
                                id: true,
                                image: true,
                                fullName: true
                            }
                        },
                        status: true,
                        price: true,
                        distanceKm: true,
                        fromAddress: true,
                        toAddress: true,
                        isUrgent: true
                    }
                })
                return rideRequest;
            }

        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async deleteNotification(userId: string, notificationId: string){
        try {
            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}});
            if(!notification) throw new NotFoundException("Njoftimi nuk u gjet");
            if(notification.userId !== userId) throw new ForbiddenException("Ju nuk keni te drejte per te kryer kete veprim.")
            await this.prisma.notification.delete({where: {id: notification.id}});
            this.conversationGateway.countUnreadNotifications(userId).catch(error => {
                console.error(error);
            });
            return {success: true}
        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async makeReadNotifications(userId: string){
        try {
            await this.prisma.notification.updateMany({where: {userId}, data: {read: true}})
            this.conversationGateway.countUnreadNotifications(userId).catch(error => {
                console.error(error);
            });
            return {success: true}
        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }
}
