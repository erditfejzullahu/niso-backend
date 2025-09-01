import { Type } from "class-transformer";
import { IsNumber, Max, Min } from "class-validator";

export class PaginationDto {
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page: number = 1;

    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit: number = 10;

    getSkip(): number {
        return (this.page - 1) * this.limit; 
    }
}