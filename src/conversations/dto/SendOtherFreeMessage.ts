import { Transform, TransformFnParams } from "class-transformer";
import { IsArray, IsBase64, IsString, IsUUID } from "class-validator";
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

    @IsBase64()
    @IsArray()
    mediaUrls: string[];
}