import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDTO {
    @IsNotEmpty()
    @IsEmail()
    email: string;
    
    @IsNotEmpty()
    @IsString()
    resetToken: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;
}