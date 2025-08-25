import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { ConversationsGateway } from "./conversations.gateway";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthService } from "src/auth/auth.service";
import { UploadService } from "src/upload/upload.service";
import { DriverFixedTarifs, Message, RideRequest, Role, User, UserInformation } from "@prisma/client";
import { SendOtherFreeMessageDto } from "./dto/SendOtherFreeMessage";

@Injectable()
export class ConversationsGatewayServices{
    
    constructor(
        @Inject(forwardRef(() => ConversationsGateway))
        private readonly gateway: ConversationsGateway,
        private readonly prisma: PrismaService,

        @Inject((forwardRef(() => AuthService)))
        private readonly authService: AuthService,
        private readonly uploadService: UploadService
    ){}

    //check if type of message is not ride related and if its allowed to chat
    private async checkConversationAllowanceAndType(driverId: string, passengerId: string, conversationId: string){
        try {
            const conversation = await this.prisma.conversations.findUnique({where: {id: conversationId}, select: {driverId: true, passengerId: true, type: true, isResolved: true}});
            if(!conversation) return false;
            if(conversation.type === "RIDE_RELATED" || conversation.isResolved) return false;
            if((conversation.driverId !== driverId || conversation.driverId !== passengerId) || (conversation.passengerId !== driverId || conversation.passengerId !== passengerId)) return false;
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async handleUserConnection(token: string) {
        try {
            const payload: any = await this.authService.verifyAsync(token);
            return payload;
        } catch (error) {
            return null;
        }
    }

    //send free message about other topics not related.
    async sendOtherMessage(senderId: string, senderRole: string, senderImage: string, senderFullname: string, sendOtherMsgDto: SendOtherFreeMessageDto){
        const allowance = await this.checkConversationAllowanceAndType(sendOtherMsgDto.driverId, sendOtherMsgDto.passengerId, sendOtherMsgDto.conversationId);
        if(allowance){

            let mediaReceived: string[] = []
            const receiverId = senderId === sendOtherMsgDto.driverId ? sendOtherMsgDto.passengerId : sendOtherMsgDto.driverId;

            if(mediaReceived && mediaReceived.length > 0){
                const mediaPromises = mediaReceived.map(file => this.uploadService.uploadBase64File(file, `conversations/${sendOtherMsgDto.conversationId}`));
                const mediaResults = Promise.all(mediaPromises);
                mediaReceived = (await mediaResults).map(item => item.data?.uri);
            }

            
            
            const targetSocketReceiverId = this.gateway.getUserSocket(receiverId);
            if(targetSocketReceiverId){
                const message = await this.prisma.message.create({
                    data: {
                        conversationId: sendOtherMsgDto.conversationId,
                        senderId,
                        senderRole: senderRole as Role,
                        content: sendOtherMsgDto.content,
                        isRead: true,
                        mediaUrls: mediaReceived,
                    },
                })
                this.gateway.server.to(targetSocketReceiverId).emit('newMessage', message)

                this.gateway.server.to(targetSocketReceiverId).emit('conversationAlert', {
                    conversationId: sendOtherMsgDto.conversationId,
                    senderId,
                    preview: sendOtherMsgDto.content.substring(0,50),
                    sentAt: message.createdAt,
                    senderImage,
                    senderFullname
                })
            }else{
                await this.prisma.message.create({
                    data: {
                        conversationId: sendOtherMsgDto.conversationId,
                        senderId,
                        senderRole: senderRole as Role,
                        content: sendOtherMsgDto.content,
                        isRead: false,
                        mediaUrls: mediaReceived,
                    },
                })
            }
            await this.prisma.conversations.update({where: {id: sendOtherMsgDto.conversationId}, data: {lastMessageAt: new Date()}});

            // return message;
        }else{
            const targetSocketSenderId = this.gateway.getUserSocket(senderId);
            if(targetSocketSenderId){
                this.gateway.server.to(targetSocketSenderId).emit('errorSendingMessage', {success: false});
                //emit error to user via socket.
            }
        }
    }

    //(contactDriverForDifferentReason)
    //contactDriverForDifferentReason helper function
    //for lost items, chatting or smth
    //driver listens to contactedDriverOtherReson
    public async contactDriverForDifferentReason(driverId: string){
        const targetDriverIdSocket = this.gateway.getUserSocket(driverId);
        if(targetDriverIdSocket){
            this.gateway.server.to(targetDriverIdSocket).emit('contactedDriverOtherReason', {success: true});
        }
    }

    //make read messages to user that sended messages that u didnt read.
    public async makeReadMessagesCallFromService(userId: string){
        const targetUserIdSocket = this.gateway.getUserSocket(userId);
        if(targetUserIdSocket){
            this.gateway.server.to(targetUserIdSocket).emit('makeReadMessages', {success: true});
        }
    }


    //notify drivers about new ride request(createNewRideRequestByPassenger)
    public async createdRideRequestAlertToDrivers(rideRequest: RideRequest, passenger: Partial<User & {userInformation: UserInformation}>, notification: Partial<Notification>){
        const driversByCity = await this.prisma.user.findMany({
            where: {userInformation: {city: passenger.userInformation?.city}},
            select: {
                id: true
            }
        })

        //notification updater
        const targetPassengerSocketId = this.gateway.getUserSocket(passenger.id!)
        if(targetPassengerSocketId){
            this.gateway.server.to(targetPassengerSocketId).emit('newNotification', notification)
            await this.counterUpdaterToUserAlert(passenger.id!, targetPassengerSocketId)
        }

        if(driversByCity && driversByCity.length > 0){
            driversByCity.forEach(async item => {
                const targetDriverSocketId = this.gateway.getUserSocket(item.id);
                if(targetDriverSocketId){
                    this.gateway.server.to(targetDriverSocketId).emit("newRideRequest", rideRequest, passenger)
                }
            })
        }
    }

    //when passager accepted driver new price offer (connectRideRequestByPassenger)
    public passagerAcceptedDriverPriceOfferAlert(driverId: string){
        const targetDriverSocketId = this.gateway.getUserSocket(driverId);
        if(targetDriverSocketId) this.gateway.server.to(targetDriverSocketId).emit('passengerAcceptedPriceOffer', {success: true});
    }

    //when driver accepted the passager counter offer (connectRideRequestByDriver)
    public driverAcceptedPassengerPriceOfferAlert(passengerId: string){
        const targetPassengerId = this.gateway.getUserSocket(passengerId)
        if(targetPassengerId) this.gateway.server.to(targetPassengerId).emit('driverAcceptedPriceOffer', {success: true});
    }

    //when passenger sends counter price to driver(sendPriceOfferFromPassengerToDriver)
    public passengerSendsPriceOfferToDriverAlert(driverId: string, messageWithSender: Message & {sender: User}){
        const targetDriverId = this.gateway.getUserSocket(driverId);
        if(targetDriverId) this.gateway.server.to(targetDriverId).emit('passengerSendedPriceOffer', messageWithSender);
    }

    //when driver sends counter price to passenger(sendPriceOfferFromDriverToPassenger)
    public driverSendsPriceOfferToPassengerAlert(passengerId: string, messageWithSender: Message & {sender: User}){
        const targetPassengerId = this.gateway.getUserSocket(passengerId);
        if(targetPassengerId) this.gateway.server.to(targetPassengerId).emit('driverSendedPriceOffer', messageWithSender);
    }

    //alert to users that new driver is in place based on city(registerUser)
    public async newRegisteredDriverNotifyToPassengersAlert(newDriver: User & {userInformation: UserInformation}){
        const passengersByCity = await this.prisma.user.findMany({
            where: {userInformation: {city: newDriver.userInformation.city}}
        })

        if(passengersByCity && passengersByCity.length > 0){
            passengersByCity.forEach(item => {
                const targetPassengerSocketId = this.gateway.getUserSocket(item.id);
                if(targetPassengerSocketId) this.gateway.server.to(targetPassengerSocketId).emit('newDriverInTown', newDriver);
            })
        }
    }

    //alert passengers that driver has created new tarif in town(addFixedTarif)
    public async newTarifCreatedByDriverAlert(newTarif: DriverFixedTarifs & {user: User}){
        const passengersByCity = await this.prisma.user.findMany({
            where: {userInformation: {city: newTarif.city}}
        })

        if(passengersByCity && passengersByCity.length > 0){
            passengersByCity.forEach(item => {
                const targetPassengerSocketId = this.gateway.getUserSocket(item.id);
                if(targetPassengerSocketId) this.gateway.server.to(targetPassengerSocketId).emit('newTarifInTown', newTarif);
            })
        }
    }

    //passenger finished conversation with driver(finishConversationByPassenger)
    public passengerFinishedConversationAlert(passenger: Partial<User>, driverId: string){
        const targetDriverSocketId = this.gateway.getUserSocket(driverId);
        if(targetDriverSocketId) this.gateway.server.to(targetDriverSocketId).emit('passengerFinishedConversation', passenger)
    }

    //driver manually finished ride(completeRideManuallyByDriver)
    //shfaqet njoftimi te pasagjeri mbi qa don me ba; e klikon shfaqet modali per vlersim e qisi.
    public completedRideByDriverAlert(passengerId: string, driverId: string, connectedRideId: string){
        const targetPassengerSocketId = this.gateway.getUserSocket(passengerId);
        const sendObject = {passengerId, driverId, connectedRideId}
        if(targetPassengerSocketId) this.gateway.server.to(targetPassengerSocketId).emit('driverManuallyCompletedRide', sendObject)
    }

    //passenger manually finished ride(cancelRideManuallyByPassenger)
    //shfaqet njoftimi te shoferi mbi qa don me ba; e klikon shfaqet modali per vlersim e qisi.
    public cancelRideManuallyByPassengerAlert(driverId: string, passengerId: string, connectedRideId: string){
        const targetDriverSocketId = this.gateway.getUserSocket(driverId);
        const sendObject = {passengerId, driverId, connectedRideId};
        if(targetDriverSocketId) this.gateway.server.to(targetDriverSocketId).emit('passengerManuallyCanceledRide', sendObject)
    }

    //when drive starts notify passenger(startRideManuallyByDriver)
    public startRideManuallyToPassengerAlert(passengerId: string){
        const targetPassengerSocketId = this.gateway.getUserSocket(passengerId);
        if(targetPassengerSocketId) this.gateway.server.to(targetPassengerSocketId).emit('getNotifiedWhenRideStarts', {success: true});
    }


    //notification counter updater alert to user
    public async counterUpdaterToUserAlert(userId: string, socketId?: string | null,){
        const notificationCounter = await this.prisma.notification.count({
            where: {userId}
        })
        if(socketId){
            this.gateway.server.to(socketId).emit('notificationCounterUpdater', notificationCounter)
        }else{
            const targetUserSocketId = this.gateway.getUserSocket(userId);
            if(targetUserSocketId){
                this.gateway.server.to(targetUserSocketId).emit('notificationCounterUpdater', notificationCounter)
            }
        }
    }

    //notification to registered user(registerUser)
    public notificationToRegisteredUserAlert(userId: string, notification: Partial<Notification>){
        const targetUserSocketId = this.gateway.getUserSocket(userId);
        if(targetUserSocketId){
            this.counterUpdaterToUserAlert(userId, targetUserSocketId,)
            this.gateway.server.to(targetUserSocketId).emit('newNotificationListener', notification)
        }
    }

    //notification to user that verified identity(verifyIdentity)
    public notificationToUserVerifiedIdentityAlert(userId: string, notification: Partial<Notification>){
        const targetUserSocketId = this.gateway.getUserSocket(userId);
        if(targetUserSocketId){
            this.counterUpdaterToUserAlert(userId, targetUserSocketId);
            this.gateway.server.to(targetUserSocketId).emit('newNotificationListener', notification);

        }
    }
}