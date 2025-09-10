import { CarBrand, CarColor, Gender, KosovoCity } from "@prisma/client";
import { Transform, TransformFnParams } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsStrongPassword, IsUrl, Max, Min } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

const getYear = new Date();

export class UpdateUserInformationDto {
    @IsString()
    @IsNotEmpty()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    fullName: string;

    @IsString()
    @IsNotEmpty()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    address: string;

    @IsEnum(KosovoCity)
    city: string;

    @IsOptional()
    @IsEnum(CarBrand)
    carModel?: string | null;

    @IsOptional()
    @IsEnum(CarColor)
    carColor?: string | null;

    @IsOptional()
    @Min(1995)
    @Max(getYear.getFullYear())
    carYear?: number | null;

    @IsOptional()
    @IsString()
    carPlates?: string | null;

    @IsEnum(Gender)
    gender: string;

    @IsEmail()
    email: string;

    @IsOptional()
    yourDesiresForRide?: string;
}