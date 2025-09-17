import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationsGatewayServices } from './conversations.gateway-services';
import { User } from '@prisma/client';
import { UploadService } from 'src/upload/upload.service';
import { InitiateSupportTicketDto } from './dto/initiateSupportTicket.dto';
import { PaginationDto } from 'utils/pagination.dto';

@Injectable()
export class ConversationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly gatewayServices: ConversationsGatewayServices,
        private readonly uploadService: UploadService
    ){}

    async initiateSupportTicket(user: User, initateDto: InitiateSupportTicketDto, files?: {evidences: Express.Multer.File[]}) {
        try {
            
            const getRandomSupport = await this.prisma.user.findMany({
                where: {role: "SUPPORT"},
                select: {id: true},
                orderBy: {id: "desc"}
            })
            
            const randomSupport = getRandomSupport[Math.floor(Math.random() * getRandomSupport.length)];
            const isDriver = user.role === "DRIVER";

            let mediasToUpload: string[] = []

            if(files){
                const mediaResults = await this.uploadService.uploadMultipleFiles(files.evidences);
                if(mediaResults.every(item => item.success) === false) throw new BadRequestException("Problem ne ngarkimin e imazheve te paraqitura.");
                mediasToUpload = mediaResults.map(item => item.data?.url);
            }

            const newConversation = await this.prisma.conversations.create({
                data: {
                    driverId: isDriver ? user.id : null,
                    passengerId: !isDriver ? user.id : null,
                    supportId: randomSupport.id,
                    rideRequestId: null,
                    type: "SUPPORT",
                    subject: initateDto.subject,
                    isResolved: false,
                    lastMessageAt: new Date(),
                    messages: {
                        create: {
                            senderId: user.id,
                            senderRole: isDriver ? "DRIVER" : "PASSENGER",
                            isRead: false,
                            content: initateDto.content,
                            mediaUrls: mediasToUpload
                        }
                    }
                }
            })

            return {success: true, id: newConversation.id}; //id in case of redirection.

            //logic to notify supporter.
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    // kur osht kry udhetimi e bahet finish prej shoferit ose najqysh me lokacion.
    // ose kur nuk jon marr vesh e kryhet biseda para se mja nis.
    async finishConversationByPassenger(passengerId: string, rideRequestId: string){
        try {
            const passenger = await this.prisma.user.findUnique({
                where: {id: passengerId},
                select: {
                    id: true,
                    image: true,
                    fullName: true,
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
                    isResolved: true,
                    driverId: true
                }
            })
            if(!rideConversation || !rideConversation.driverId){
                throw new BadRequestException("Biseda me shoferin nuk u gjet")
            }else{
                await this.prisma.conversations.update({
                    where: {id: rideConversation.id},
                    data: {
                        isResolved: true
                    }
                })
                
                this.gatewayServices.passengerFinishedConversationAlert(passenger, rideConversation.driverId)
                return {success: true}
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    

    //a lejohet shoferi mu kyc nbised me passagjerin me mesazhe, nese po shfaqi mesazhet.
    async getIntoConversationWithPassenger(driverId: string, conversationId: string){
        try {
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
            if(!conversation || !conversation.driver) throw new NotFoundException("Nuk u gjet biseda.");
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
                    support: {
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
                            senderId: true,
                            content: true,
                            createdAt: true,
                            senderRole: true,
                            isRead: true
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
                    support: {
                        select: {
                            id: true,
                            fullName: true,
                            image: true,
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
                            isRead: true,
                            content: true,
                            createdAt: true,
                            senderRole: true,
                            senderId: true,
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
    async getAllMessagesByConversationId(userId: string, conversationId: string, paginationDto: PaginationDto){
        try {

            const conversation = await this.prisma.conversations.findUnique({
                where: {id: conversationId},
                select: {
                    isResolved: true,
                    driverId: true,
                    passengerId: true,
                    supportId: true
                }
            })

            
            if(!conversation){
                throw new NotFoundException("Biseda nuk u gjet.");
            }
            
            if(conversation.isResolved) throw new ForbiddenException("Biseda ka perfunduar.");
            
            //mark other users messages as read
            const whoSendedMessagesId = userId === conversation.driverId ? conversation.passengerId : userId === conversation.passengerId ? conversation.driverId : conversation.supportId;
            
            if(whoSendedMessagesId){
                await this.prisma.message.updateMany({
                    where: {
                        AND: [
                            {conversationId},
                            {senderId: whoSendedMessagesId!},
                            {isRead: false}
                        ]
                    },
                    data: {
                        isRead: true
                    }
                })
                await this.gatewayServices.makeReadMessagesCallFromService(whoSendedMessagesId);
            }

            const messagesWithoutConversations = await this.prisma.message.findMany({
                where: {conversationId},
                orderBy: {
                    createdAt: "desc"
                },
                skip: paginationDto.getSkip(),
                take: paginationDto.limit
            })

            return messagesWithoutConversations;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.");
        }
    }





    //psh kur e ka kry udhetimin/biseden me to e kerkon me bo bised prap.
    //arsye i ka hup diqka nkerr ose diqka e till ose veq kontakt hajt.
    //kjo duhet me kan nsocket qe me marr shoferi lajmin realtime.
    //osht tu u perdor ne conversation gateway
    async contactDriverForDifferentReason(passengerId: string, conversationId: string){ 
        try {
            const passenger = await this.prisma.user.findUnique({where: {id: passengerId}, select: {id: true}})
            if(!passenger) throw new NotFoundException("Pasagjeri nuk u gjet.");

            const conversation = await this.prisma.conversations.findUnique({where: {id: conversationId}, select: {id: true, passengerId: true, driverId: true}});
            if(!conversation || !conversation.driverId) throw new NotFoundException("Nuk u gjet ndonje bisede.");
            if(conversation.passengerId !== passenger.id) throw new ForbiddenException("Ju nuk keni te drejte per te kryer kete veprim.");

            await this.prisma.conversations.update({
                where: {id: conversation.id},
                data: {
                    isResolved: false
                }
            })

            //inform driver if its available.
            await this.gatewayServices.contactDriverForDifferentReason(conversation.driverId);
            return {success: true};

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim.")
        }
    };







    


    
}
