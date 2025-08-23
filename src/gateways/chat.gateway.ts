import { Logger, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import * as jwt from "jsonwebtoken"
import { Socket } from "socket.io-client";

@WebSocketGateway({namespace: '/chat', transports: ['websocket'], cors: {origin: "*"}})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{
    private readonly logger = new Logger(ChatGateway.name);

    @WebSocketServer()
    server: Server;

    afterInit() {
        console.log('Chat gateway initialized');
    }

    async handleConnection(client: any, ...args: any[]) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers['authorization']?.split(' ')[1];
            if(!token) return client.disconnect();

            const payload = jwt.verify(token,  process.env.JWT_ACCESS_SECRET!) as {sub: string; email: string, fullName: string, role: string}
            (client as any).userId = payload.sub;

            client.join(payload.sub);
            console.log(`User ${payload.sub} connected`);
        } catch (error) {
            console.error("Error connecting: ", error.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: any) {
        console.log(`User ${(client as any).userId} disconnected`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, payload: {receiverId: string, message: string}) {
        const senderId = (client as any).userId;

        this.server.to(payload.receiverId).emit('receiveMessage', {
            senderId,
            message: payload.message,
            createdAt: new Date()
        })

        this.server.to(senderId).emit('messageSent', {
            receiverId: payload.receiverId,
            message: payload.message
        })
    }

    // Utility: allow sending from controller/service
    sendMessageToUser(userId: string, data: any) {
        this.server.to(userId).emit('receiveMessage', data);
    }

}