import { Transform, TransformFnParams } from "class-transformer";
import { IsDecimal, IsString, IsUUID } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class SendPriceOfferDto {
    @IsUUID()
    driverId: string;

    @IsUUID()
    passengerId: string;

    @IsUUID()
    conversationId: string;

    @IsDecimal()
    priceOffer: number;

    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    content?: string;
}