import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { ConversationsGateway } from 'src/conversations/conversations.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly prisma: PrismaService,
    ){}

    async getNotificationById(userId: string, notificationId: string){
        try {
            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}});
            if(!notification) throw new NotFoundException("Njoftimi nuk u gjet.");
            if(notification.userId !== userId) throw new ForbiddenException("Ju nuk keni te drejte per kryerjen e ketij veprimi.");

            return notification;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

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

    async getNotificationConnectedRide(user: User, notificationId: string){
        try {

            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}, select: {id: true, userId: true, metadata: true}})
            if(!notification || !notification.metadata) throw new NotFoundException("Nuk u gjet njoftimi.");
            const metadata: any = JSON.parse(notification.metadata as string);
            if(!metadata.connectedRide) throw new BadRequestException("Nuk ka te dhena te mjaftueshme.");

            if(user.role === "DRIVER"){
                const connectedRide = await this.prisma.connectedRide.findUnique({
                    where: {id: metadata.connectedRide},
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
                    where: {id: metadata.connectedRide},
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
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async getNotificationRideRequest(user: User, notificationId: string){
        try {
            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}, select: {id: true, userId: true, metadata: true}})
            if(!notification || !notification.metadata) throw new NotFoundException("Nuk u gjet njoftimi.");
            const metadata: any = JSON.parse(notification.metadata as string);
            if(!metadata.rideRequest) throw new BadRequestException("Nuk ka te dhena te mjaftueshme.");

            if(user.role === "DRIVER"){
                const rideRequest = await this.prisma.rideRequest.findUnique({
                    where: {id: metadata.rideRequest},
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
                    where: {id: metadata.rideRequest},
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
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async deleteNotification(userId: string, notificationId: string){
        try {
            const notification = await this.prisma.notification.findUnique({where: {id: notificationId}});
            if(!notification) throw new NotFoundException("Njoftimi nuk u gjet");
            if(notification.userId !== userId) throw new ForbiddenException("Ju nuk keni te drejte per te kryer kete veprim.")
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
