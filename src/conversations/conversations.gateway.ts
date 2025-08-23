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
import { Role } from "@prisma/client";
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
            (client as any).user = {id: userId, role: role};

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
        const allowance = await this.conversationService.checkConversationAllowanceAndType(dto.driverId, dto.passengerId, dto.conversationId);
        if(allowance){

            let mediaReceived: string[] = []
            const receiverId = senderId === dto.driverId ? dto.passengerId : dto.driverId;

            if(mediaReceived && mediaReceived.length > 0){
                const mediaPromises = mediaReceived.map(file => this.uploadService.uploadBase64File(file, `conversations/${dto.conversationId}`));
                const mediaResults = Promise.all(mediaPromises);
                mediaReceived = (await mediaResults).map(item => item.data?.uri);
            }

            const message = await this.prisma.message.create({
                data: {
                    conversationId: dto.conversationId,
                    senderId,
                    senderRole: senderRole as Role,
                    content: dto.content,
                    mediaUrls: mediaReceived,
                },
            })
            
            const targetSocketId = this.userSocket.get(receiverId);
            if(targetSocketId){
                this.server.to(targetSocketId).emit('newMessage', message)
                await this.prisma.conversations.update({where: {id: dto.conversationId}, data: {lastMessageAt: new Date()}});
            }

            return message;
        }else{
            //emit error to user via socket.
        }
    }

    //contactDriverForDifferentReadon helper function
}