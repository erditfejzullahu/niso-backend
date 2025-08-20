import { Transform, TransformFnParams } from "class-transformer"
import {IsEmail, IsNumber, IsString, IsStrongPassword, Max, Min} from "class-validator"
import { sanitizeContent } from "common/utils/sanitize.utils"
export class RegisterUserDto {
    @IsString()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    fullName: string;

    @IsString()
    @IsEmail()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value).toLowerCase())
    email: string;

    @IsNumber()
    @Min(1)
    @Max(2)
    role: number;

    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    password: string;

    
}