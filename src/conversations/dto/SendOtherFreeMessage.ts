import { Transform, TransformFnParams } from "class-transformer";
import { IsArray, IsBase64, IsOptional, IsString, IsUUID } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class SendOtherFreeMessageDto {
    @IsUUID()
    passengerId: string;

    @IsUUID()
    driverId: string;

    @IsUUID()
    conversationId: string;

    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    content: string;

    @IsOptional()
    @IsArray()
    @IsBase64(undefined, { each: true })
    mediaUrls: string[];
}