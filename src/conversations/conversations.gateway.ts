import { forwardRef, Inject, Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Socket } from "socket.io-client";
import { SendOtherFreeMessageDto } from "./dto/SendOtherFreeMessage";
import { ConversationsGatewayServices } from "./conversations.gateway-services";

@WebSocketGateway({
    cors: { origin: true, credentials: true },
    namespace: '/updates'
})
export class ConversationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server!: Server;
    private readonly logger = new Logger(ConversationsGateway.name);

    private userSocket = new Map<string, string>();

    constructor(
        @Inject(forwardRef(() => ConversationsGatewayServices))
        private readonly gatewayServices: ConversationsGatewayServices
    ){}

    getUserSocket(userId: string){
        return this.userSocket.get(userId);
    }

    async handleConnection(client: any,) {
        const token = 
            (client.handshake.auth && (client.handshake.auth as any).token) || 
            (client.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!token) {
            this.logger.warn(`No token; disconnecting socket ${client.id}`);
            return client.disconnect(true);
        }

        const getPayload = await this.gatewayServices.handleUserConnection(token);
        if (!getPayload?.sub) {
            this.logger.warn(`JWT verify failed; disconnecting ${client.id}`);
            return client.disconnect(true);
        }

        const userId = String(getPayload.sub);
        const role = String(getPayload.role);
        const image = String(getPayload.profileImage ?? getPayload.image ?? '');
        const fullName = String(getPayload.fullName ?? '');

        (client as any).user = { id: userId, role, image, fullName };

        const prev = this.userSocket.get(userId);
        if (prev && prev !== client.id) {
            try {
                this.server.sockets.sockets.get(prev)?.disconnect(true);
            } catch { 
                console.warn(`Error disconnecting previous socket for user ${userId}`);
             }
        }

        this.userSocket.set(userId, client.id);
        this.logger.log(`User ${userId} connected with ${client.id}`);
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
        this.gatewayServices.sendOtherMessage(senderId, senderRole, senderImage, senderFullname, dto);
    }

}