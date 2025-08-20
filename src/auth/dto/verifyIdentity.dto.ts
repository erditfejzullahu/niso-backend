import { Gender, KosovoCity } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class VerifyIdentityDto {
    @IsString()
    @IsNotEmpty()
    address: string;

    @IsEnum(KosovoCity)
    city: string;

    @IsEnum(Gender)
    gender: string;
}