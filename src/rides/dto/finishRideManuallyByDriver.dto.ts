import { IsLatitude, IsLongitude, IsUUID } from "class-validator";

export class FinishRideManuallyByDriverDto{
    @IsUUID()
    connectedRideId: string;

    @IsLatitude()
    driverExactLatitude: string;

    @IsLongitude()
    driverExactLongitude: string;
}