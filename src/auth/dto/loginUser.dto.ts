import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginUserDto {
    @IsString()
    @IsEmail()
    @Transform(({value}) => value.toLowerCase().trim())
    email: string;

    @IsString()
    @MinLength(8)
    @MaxLength(100)
    password: string;
}