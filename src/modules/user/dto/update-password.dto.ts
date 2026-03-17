import { IsNotEmpty, IsString, Matches, Min, MinLength } from "class-validator";

export class UpdatePasswordDTO {
    @IsNotEmpty()
    @IsString()
    currentPassword: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/, { 
        message: "newPassword must contain at least 8 characters, including uppercase, lowercase, number, and special character"
    })
    newPassword: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/, { 
        message: "newConfirmPassword must contain at least 8 characters, including uppercase, lowercase, number, and special character"
    })
    newConfirmPassword: string;
}