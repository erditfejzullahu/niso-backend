import { Type } from "class-transformer";
import { IsDate, IsIn, IsNumber, IsOptional, Min } from "class-validator";

export class GetAvailableRidesDto {
    @IsOptional()
    @IsIn(['oldest', 'latest'])
    sortOrder: 'oldest' | 'latest' = 'latest';

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    fromDate?: Date | null;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    toDate?: Date | null;

    @IsOptional()
    @IsIn(['urgent', 'normal'])
    urgencyType: 'urgent' | 'normal' = 'normal'

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    distanceRange?: number;
}