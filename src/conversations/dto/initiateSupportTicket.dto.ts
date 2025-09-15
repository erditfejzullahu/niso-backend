import { Transform, TransformFnParams } from "class-transformer";
import { IsString, IsUUID } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class InitiateSupportTicketDto {
    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    content: string;

    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    subject: string;
}