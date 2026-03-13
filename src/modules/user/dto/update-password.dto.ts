import { IsNotEmpty, IsString, Min, MinLength } from "class-validator";

export class UpdatePasswordDTO {
    @IsNotEmpty()
    @IsString()
    currentPassword: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newPassword: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newConfirmPassword: string;
}