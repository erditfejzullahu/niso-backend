import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { AuthService } from "src/auth/auth.service";
import { PrismaService } from "src/prisma/prisma.service";
import { RideService } from "src/rides/rides.service";
import { ConversationsService } from "./conversations.service";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io-client";
import { SendOtherFreeMessageDto } from "./dto/SendOtherFreeMessage";
import { RideRequest, Role, User, UserInformation } from "@prisma/client";
import { UploadService } from "src/upload/upload.service";

@WebSocketGateway({
    cors: {origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true},
    namespace: '/chat'
})
export class ConversationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server!: Server;
    private readonly logger = new Logger(ConversationsGateway.name);

    private userSocket = new Map<string, string>();

    constructor(
        private readonly authService: AuthService,
        private readonly prisma: PrismaService,
        private readonly rideService: RideService,
        private readonly conversationService: ConversationsService,
        private readonly jwtService: JwtService,
        private readonly uploadService: UploadService
    ){}

    async handleConnection(client: any,) {
        const token = 
            (client.handshake.auth && (client.handshake.auth as any).token) || 
            (client.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!token) {
            this.logger.warn(`No token; disconnecting socket ${client.id}`);
            return client.disconnect(true);
        }

        try {
            const payload: any = await this.jwtService.verifyAsync(token);
            const userId = String(payload.sub);
            const role = String(payload.role);
            const image = String(payload.image);
            const fullName = String(payload.fullName);

            (client as any).user = {id: userId, role: role, image: image, fullName: fullName};

            //enforce singje-device, if previous socket exists, drop it
            const prev = this.userSocket.get(userId);
            if(prev && prev !== client.id) {
                try {this.server.sockets.sockets.get(prev)?.disconnect(true);} catch {}
            }

            //dmth stored userid and socketid
            this.userSocket.set(userId, client.id);
            this.logger.log(`User ${userId} connected with ${client.id}`);
        } catch (error) {
            this.logger.warn(`JWT verify failed; disconnecting ${client.id}`);
            client.disconnect(true);
        }
    }

    async handleDisconnect(client: Socket) {
        for (const [uid, sid] of this.userSocket.entries()) {
            if (sid === client.id) {
                this.userSocket.delete(uid);
                this.logger.log(`User ${uid} disconnected (${client.id})`);
                break;
            }
        }
    }

    //socket events

    //only for OTHER type of conversations
    @SubscribeMessage('sendOtherMessage')
    async onSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: SendOtherFreeMessageDto
    ){
        const senderId = (client as any).user.id as string;
        const senderRole = (client as any).user.role as string;
        const senderImage = (client as any).user.image as string;
        const senderFullname = (client as any).user.fullName as string;

        const allowance = await this.conversationService.checkConversationAllowanceAndType(dto.driverId, dto.passengerId, dto.conversationId);
        if(allowance){

            let mediaReceived: string[] = []
            const receiverId = senderId === dto.driverId ? dto.passengerId : dto.driverId;

            if(mediaReceived && mediaReceived.length > 0){
                const mediaPromises = mediaReceived.map(file => this.uploadService.uploadBase64File(file, `conversations/${dto.conversationId}`));
                const mediaResults = Promise.all(mediaPromises);
                mediaReceived = (await mediaResults).map(item => item.data?.uri);
            }

            
            
            const targetSocketReceiverId = this.userSocket.get(receiverId);
            if(targetSocketReceiverId){
                const message = await this.prisma.message.create({
                    data: {
                        conversationId: dto.conversationId,
                        senderId,
                        senderRole: senderRole as Role,
                        content: dto.content,
                        isRead: true,
                        mediaUrls: mediaReceived,
                    },
                })
                this.server.to(targetSocketReceiverId).emit('newMessage', message)

                this.server.to(targetSocketReceiverId).emit('conversationAlert', {
                    conversationId: dto.conversationId,
                    senderId,
                    preview: dto.content.substring(0,50),
                    sentAt: message.createdAt,
                    senderImage,
                    senderFullname
                })
            }else{
                await this.prisma.message.create({
                    data: {
                        conversationId: dto.conversationId,
                        senderId,
                        senderRole: senderRole as Role,
                        content: dto.content,
                        isRead: false,
                        mediaUrls: mediaReceived,
                    },
                })
            }
            await this.prisma.conversations.update({where: {id: dto.conversationId}, data: {lastMessageAt: new Date()}});

            // return message;
        }else{
            const targetSocketSenderId = this.userSocket.get(senderId);
            if(targetSocketSenderId){
                this.server.to(targetSocketSenderId).emit('errorSendingMessage', {success: false});
                //emit error to user via socket.
            }
        }
    }

    //contactDriverForDifferentReason helper function
    //for lost items, chatting or smth
    //driver listens to contactedDriverOtherReson
    public async contactDriverForDifferentReason(driverId: string){
        const targetDriverIdSocket = this.userSocket.get(driverId);
        if(targetDriverIdSocket){
            this.server.to(targetDriverIdSocket).emit('contactedDriverOtherReason', {success: true});
        }
    }

    //make read messages to user that sended messages that u didnt read.
    public async makeReadMessagesCallFromService(userId: string){
        const targetUserIdSocket = this.userSocket.get(userId);
        if(targetUserIdSocket){
            this.server.to(targetUserIdSocket).emit('makeReadMessages', {success: true});
        }
    }


    //notify drivers about new ride request
    public async createdRideRequestAlertToDrivers(rideRequest: RideRequest, passenger: Partial<User & {userInformation: UserInformation}>){
        const driversByCity = await this.prisma.user.findMany({
            where: {userInformation: {city: passenger.userInformation?.city}},
            select: {
                id: true
            }
        })

        if(driversByCity && driversByCity.length > 0){
            driversByCity.forEach(item => {
                const targetDriverSocketId = this.userSocket.get(item.id);
                if(targetDriverSocketId){
                    this.server.to(targetDriverSocketId).emit("newRideRequest", rideRequest, passenger)
                }
            })
        }
    }

    //when passager accepted driver new price offer
    public passagerAcceptedDriverPriceOfferAlert(driverId: string){
        const targetDriverSocketId = this.userSocket.get(driverId);
        if(targetDriverSocketId) this.server.to(targetDriverSocketId).emit('passengerAcceptedPriceOffer');
    }

}