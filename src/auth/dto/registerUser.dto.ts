import { Transform, TransformFnParams } from "class-transformer"
import {IsEmail, IsNotEmpty, IsNumber, IsString, IsStrongPassword, Max, Min} from "class-validator"
import { sanitizeContent } from "common/utils/sanitize.utils"
export class RegisterUserDto {
    @IsString()
    @IsNotEmpty()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value))
    fullName: string;

    @IsString()
    @IsEmail()
    @Transform(({value}: TransformFnParams) => sanitizeContent(value).toLowerCase())
    email: string;

    @IsNumber()
    @Min(0)
    @Max(1)
    accountType: number;

    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    password: string;
    
    @IsString()
    confirmPassword: string;
}