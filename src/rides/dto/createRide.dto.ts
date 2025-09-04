import { IsBoolean, IsDecimal, IsEnum, IsNotEmpty, IsString } from "class-validator";

export class CreateNewRideRequestDto {

    @IsBoolean()
    isUrgent: boolean;

    @IsDecimal()
    price: number;

    @IsString()
    @IsNotEmpty()
    fromAddress: string;

    @IsString()
    @IsNotEmpty()
    toAddress: string;
}