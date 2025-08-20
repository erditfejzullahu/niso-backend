import { Gender, KosovoCity } from "@prisma/client";
import { Transform, TransformFnParams } from "class-transformer";
import { IsEnum, IsString, IsStrongPassword, IsUrl } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class UpdateUserInformationDto {
    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    fullName: string;

    @IsString()
    address: string;

    @IsEnum(KosovoCity)
    city: string;

    @IsEnum(Gender)
    gender: string;
}