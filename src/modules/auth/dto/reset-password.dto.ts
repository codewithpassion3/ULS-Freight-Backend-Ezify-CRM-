import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

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
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/, { 
        message: "password must contain at least 8 characters, including uppercase, lowercase, number, and special character"
    })
    password: string;
}