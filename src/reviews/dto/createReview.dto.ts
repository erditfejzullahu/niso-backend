import { Transform, TransformFnParams } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";

export class CreateReviewDto {
    @IsUUID()
    driverId: string;

    @IsUUID()
    connectedRideId: string;

    @IsOptional()
    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    reviewContent: string;

    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;
}