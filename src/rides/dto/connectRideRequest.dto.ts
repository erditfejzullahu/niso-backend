import { IsUUID } from "class-validator";

export class ConnectRideRequestDto {
    @IsUUID()
    passengerId: string;

    @IsUUID()
    driverId: string;

    @IsUUID()
    messageId: string;
}