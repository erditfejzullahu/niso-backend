import { INestApplication, Logger } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";

export class SocketIoAdapter extends IoAdapter {
    private readonly logger = new Logger(SocketIoAdapter.name);

    constructor(app: INestApplication) {
        super(app);
    }

    create(port: number, options?: ServerOptions) {
        const serverOptions: Partial<ServerOptions> = {
            cors: {
                origin: ['http://localhost:5173', 'http://localhost:3000'],
                credentials: true,
            },
            path: '/socket.io',
            serveClient: false,
            ...options,
        };

        const server = super.create(port, serverOptions as ServerOptions);
        this.logger.log('Socket.IO server initialized');
        return server;
    }
}