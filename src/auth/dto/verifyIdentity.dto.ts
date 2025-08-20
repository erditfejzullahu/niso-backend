import { Gender, KosovoCity } from "@prisma/client";
import { Transform, TransformFnParams } from "class-transformer";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class VerifyIdentityDto {
    @IsString()
    @IsNotEmpty()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    address: string;

    @IsEnum(KosovoCity)
    city: string;

    @IsEnum(Gender)
    gender: string;
}