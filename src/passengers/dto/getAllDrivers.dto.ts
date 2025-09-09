import { Transform, TransformFnParams } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";
import { sanitizeContent } from "common/utils/sanitize.utils";
import { PaginationDto } from "utils/pagination.dto";

export class GetAllDriversDtoFilters extends PaginationDto {
    @IsString()
    @IsIn(['all', 'favorite'])
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    driverFilters: "all" | "favorite" = "all";

    @IsOptional()
    @IsString()
    @IsIn(['name', 'rating', 'createdAt'])
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    sortBy?: 'name' | 'rating' | 'createdAt' | null = null;

    @IsOptional()
    @IsString()
    @IsIn(['asc','desc'])
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    sortOrder?: 'asc' | 'desc' | null = null;

    @IsOptional()
    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    searchParam?: string | null
}