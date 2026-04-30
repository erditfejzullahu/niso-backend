import { IsOptional, IsString } from "class-validator";

export class NotifyPassengerThatDriverReadyDto {
    @IsString()
    @IsOptional()
    message?: string | null;
}