import { Gender, KosovoCity } from "@prisma/client";
import { Transform, TransformFnParams } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsString, IsStrongPassword, IsUrl } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

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

    @IsEnum(Gender)
    gender: string;

    @IsEmail()
    email: string;
}