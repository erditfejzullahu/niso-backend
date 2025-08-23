import { INestApplication, Logger } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";

export class SocketIoAdapter extends IoAdapter {
    private readonly logger = new Logger(SocketIoAdapter.name);

    constructor(app: INestApplication) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions) {
        const cors = {
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            credentials: true,
        } as const;


        const server = super.createIOServer(port, {
            ...(options ?? {}),
            cors,
            path: '/ws', // optional; change/omit if you like
        });
        this.logger.log('Socket.IO server initialized');
        return server;
    }
}