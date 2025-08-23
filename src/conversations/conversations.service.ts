import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationsGateway } from './conversations.gateway';

@Injectable()
export class ConversationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationGateway: ConversationsGateway
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
    //osht tu u perdor ne conversation gateway
    async contactDriverForDifferentReasonSocket(passengerId: string, conversationId: string){ 
        try {
            const passenger = await this.prisma.user.findUnique({where: {id: passengerId}, select: {id: true}})
            if(!passenger) throw new NotFoundException("Pasagjeri nuk u gjet.");

            const conversation = await this.prisma.conversations.findUnique({where: {id: conversationId}, select: {id: true, passengerId: true, driverId: true}});
            if(!conversation) throw new NotFoundException("Nuk u gjet ndonje bisede.");
            if(conversation.passengerId !== passenger.id) throw new ForbiddenException("Ju nuk keni te drejte per te kryer kete veprim.");

            await this.prisma.conversations.update({
                where: {id: conversation.id},
                data: {
                    isResolved: false
                }
            })

            return {driverId: conversation.driverId};

            //TODO: inform driver about this change implementation
        } catch (error) {
            console.error(error);
            return {driverId: null};
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

    //check type of message and if its allowed to chat
    async checkConversationAllowanceAndType(driverId: string, passengerId: string, conversationId: string){
        try {
            const conversation = await this.prisma.conversations.findUnique({where: {id: conversationId}, select: {driverId: true, passengerId: true, type: true}});
            if(!conversation) throw new NotFoundException("Nuk u gjet biseda aktive.");
            if(conversation.type === "RIDE_RELATED") throw new ForbiddenException("Nuk lejoheni per kete veprim.");
            if((conversation.driverId !== driverId || conversation.driverId !== passengerId) || (conversation.passengerId !== driverId || conversation.passengerId !== passengerId)) throw new NotFoundException("Biseda nuk u gjet.");
            return true;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.");
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

    //merri krejt bisedat per me i shfaq te mesazhet e shfoerit.
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

    //perdoruesi eshte kyc ne bised.
    //check a jon te lejum dy part.
    async getAllMessagesByConversationId(userId: string, conversationId: string){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}, select: {id: true, role: true}});
            if(!user) throw new NotFoundException("Perdoruesi nuk u gjet.");

            const conversationWithMessages = await this.prisma.conversations.findUnique({
                where: {id: conversationId},
                include: {messages: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 20 //implement pagination TODO:
                }},
            })

            if(!conversationWithMessages){
                throw new NotFoundException("Biseda nuk u gjet.");
            }

            if(conversationWithMessages.isResolved) throw new ForbiddenException("Biseda ka perfunduar.");

            //mark other users messages as read
            const whoSendedMessagesId = user.id === conversationWithMessages.driverId ? conversationWithMessages.passengerId : conversationWithMessages.driverId;
            await this.prisma.message.updateMany({
                where: {
                    AND: [
                        {conversationId},
                        {senderId: whoSendedMessagesId}
                    ]
                },
                data: {
                    isRead: true
                }
            })

            await this.conversationGateway.makeReadMessagesCallFromService(whoSendedMessagesId);

            return conversationWithMessages;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.");
        }
    }
}
