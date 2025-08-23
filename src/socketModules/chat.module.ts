import { Module } from "@nestjs/common";
import { ChatGateway } from "src/gateways/chat.gateway";

@Module({
    providers: [ChatGateway],
    exports: [ChatGateway]
})
export class ChatSocketModule{}