import { KosovoCity } from "@prisma/client";
import { Transform, TransformFnParams } from "class-transformer";
import { IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class AddFixedTarifDto {
    @IsString()
    @IsNotEmpty()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    fixedTarifTitle: string;

    @IsEnum(KosovoCity)
    city: string;

    @IsString()
    @IsNotEmpty()
    locationArea: string;

    @IsDecimal()
    price: number;

    @IsOptional()
    @IsString()
    description: string;
}