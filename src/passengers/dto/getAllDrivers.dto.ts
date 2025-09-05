import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "utils/pagination.dto";

export class GetAllDriversDtoFilters extends PaginationDto {
    @IsString()
    @IsIn(['all', 'favorite'])
    driverFilters: "all" | "favorite" = "all";

    @IsOptional()
    @IsString()
    @IsIn(['name', 'rating', 'createdAt'])
    sortBy?: 'name' | 'rating' | 'createdAt' | null = null;

    @IsOptional()
    @IsString()
    @IsIn(['asc','desc'])
    sortOrder?: 'asc' | 'desc' | null = null;
}