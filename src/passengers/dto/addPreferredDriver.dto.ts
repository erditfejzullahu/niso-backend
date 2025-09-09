import { Transform, TransformFnParams } from "class-transformer";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class AddPreferredDriverDto {
    @IsUUID()
    driverId: string;

    @IsOptional()
    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    whyPreferred?: string | null;
}