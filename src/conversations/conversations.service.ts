import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConversationsService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    // kur osht kry udhetimi e bahet finish prej shoferit ose najqysh me lokacion.
    // ose kur nuk jon marr vesh e kryhet biseda para se mja nis.
    async finishConversationByPassenger(passengerId: string, rideRequestId: string){
        try {
            const passenger = await this.prisma.user.findUnique({
                where: {id: passengerId},
                select: {
                    id: true,
                    rideRequests: {
                        where: {
                            id: rideRequestId
                        },
                        select: {
                            id: true,
                            connectedRide: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                }
            })

            if(!passenger || (!passenger.rideRequests || passenger.rideRequests.length === 0)) throw new NotFoundException("Udhetimi nuk u gjet");
            const rideConversation = await this.prisma.conversations.findUnique({
                where: {
                    rideRequestId: passenger.rideRequests[0].id
                },
                select: {
                    id: true,
                    isResolved: true
                }
            })
            if(!rideConversation){
                throw new BadRequestException("Biseda me shoferin nuk u gjet")
            }else{
                await this.prisma.conversations.update({
                    where: {id: rideConversation.id},
                    data: {
                        isResolved: true
                    }
                })
                return {success: true}
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    //psh kur e ka kry udhetimin/biseden me to e kerkon me bo bised prap.
    //arsye i ka hup diqka nkerr ose diqka e till ose veq kontakt hajt.
    //kjo duhet me kan nsocket qe me marr shoferi lajmin realtime.
    async contactDriverForDifferentReason(passengerId: string, conversationId: string){ 
        try {
            const passenger = await this.prisma.user.findUnique({where: {id: passengerId}, select: {id: true}})
            if(!passenger) throw new NotFoundException("Pasagjeri nuk u gjet.");

            const conversation = await this.prisma.conversations.findUnique({where: {id: conversationId}, select: {id: true, passengerId: true}});
            if(!conversation) throw new NotFoundException("Nuk u gjet ndonje bisede.");
            if(conversation.passengerId !== passenger.id) throw new ForbiddenException("Ju nuk keni te drejte per te kryer kete veprim.");

            await this.prisma.conversations.update({
                where: {id: conversation.id},
                data: {
                    isResolved: false
                }
            })

            //TODO: inform driver about this change implementation
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    };

    //a lejohet shoferi mu kyc nbised me passagjerin me mesazhe, nese po shfaqi mesazhet.
    async getIntoConversationWithPassenger(driverId: string, conversationId: string){
        try {
            const driver = await this.prisma.user.findUnique({where: {id: driverId}, select: {id: true}});
            if(!driver) throw new NotFoundException("Nuk u gjet ndonje perdorues.");
            const conversation = await this.prisma.conversations.findUnique({
                where: {id: conversationId},
                select: {
                    id: true,
                    isResolved: true,
                    driver: {
                        select: {
                            id: true,
                            fullName: true,
                            image: true
                        }
                    },
                    passenger: {
                        select: {
                            id: true,
                            fullName: true,
                            image: true
                        }
                    },
                    messages: {
                        orderBy: {
                            createdAt: "desc"
                        },
                        select: {
                            id: true,
                            senderId: true,
                            senderRole: true,
                            createdAt: true,
                            mediaUrls: true,
                            isRead: true,

                        }
                    }
                }}
            );
            if(!conversation) throw new NotFoundException("Nuk u gjet biseda.");
            if(conversation.driver.id !== driverId) throw new ForbiddenException("Ju nuk keni leje per te kryer kete veprim.");
            if(conversation.isResolved) throw new ForbiddenException("Biseda eshte kryer nga ana e pasagjerit.");
            
            return {conversation};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    //merri krejt bisedat per me i shfaq te mesazhet e pasagjerit.
    async getAllConversationsByPassenger(passengerId: string){
        try {
            const conversations = await this.prisma.conversations.findMany({
                where: {passengerId},
                include: {
                    driver: {
                        select: {
                            id: true,
                            fullName: true,
                            image: true
                        }
                    },
                    rideRequest: {
                        select: {
                            id: true,
                            fromAddress: true,
                            toAddress: true,
                            createdAt: true,
                        },
                    },
                    messages: {
                        orderBy: {
                            createdAt: "desc",
                        },
                        take: 1,
                        select: {
                            content: true,
                            createdAt: true,
                            senderRole: true
                        }
                    }
                },
                orderBy: {
                    lastMessageAt: "desc"
                }
            })
            return conversations;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    async getAllActiveConversationsByDriver(driverId: string){
        try {
            const conversations = await this.prisma.conversations.findMany({
                where: {
                    AND: [
                        {driverId},
                        {isResolved: false}
                    ]
                },
                include: {
                    passenger: {
                        select: {
                            id: true,
                            fullName: true,
                            image: true
                        }
                    },
                    rideRequest: {
                        select: {
                            id: true,
                            fromAddress: true,
                            toAddress: true,
                            createdAt: true
                        }
                    },
                    messages: {
                        orderBy: {
                            createdAt: "desc"
                        },
                        take: 1,
                        select: {
                            content: true,
                            createdAt: true,
                            senderRole: true
                        }
                    }
                },
                orderBy: {
                    lastMessageAt: "desc"
                }
            })
            return conversations;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.");
        }
    }
}
