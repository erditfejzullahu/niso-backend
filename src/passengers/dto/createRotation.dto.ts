import { RotationDays } from "@prisma/client";
import { Transform, TransformFnParams, Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsIn, IsString } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class CreateRotationDto {
    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    fromAddress: string;

    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    toAddress: string;

    @IsDate()
    @Type(() => Date)
    pickupTime: string;

    @IsArray()
    @IsEnum(RotationDays, {each: true})
    days: string[];
}