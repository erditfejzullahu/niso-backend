import { IsDecimal, IsEnum, IsNotEmpty, IsString } from "class-validator";

export class CreateNewRideRequestDto {
    @IsDecimal()
    price: number;

    @IsString()
    @IsNotEmpty()
    fromAddress: string;

    @IsString()
    @IsNotEmpty()
    toAddress: string;
}