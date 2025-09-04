import { Type } from "class-transformer";
import { IsDate, IsEnum, IsNumber, IsOptional, Min } from "class-validator";
import { PaginationDto } from "utils/pagination.dto";

export enum SortOrder {
  OLDEST = 'oldest',
  LATEST = 'latest',
}

export enum UrgencyType {
  URGENT = 'urgent',
  NORMAL = 'normal',
}

export class GetAvailableRidesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.LATEST;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date | null;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date | null;

  @IsOptional()
  @IsEnum(UrgencyType)
  urgencyType: UrgencyType = UrgencyType.NORMAL;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  distanceRange?: number;
}
