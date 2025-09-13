import { Type } from "class-transformer";
import { IsDate, MaxDate, Validate } from "class-validator";
import { PaginationDto } from "utils/pagination.dto";

export class FinancialMirrorDataDto extends PaginationDto {
    @IsDate()
    @Type(() => Date)
    fromDate: Date

    @IsDate()
    @Type(() => Date)
    @MaxDate(() => new Date())
    toDate: Date
}
