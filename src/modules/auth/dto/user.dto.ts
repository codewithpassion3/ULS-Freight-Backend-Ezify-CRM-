import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class UserDTO {
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @IsNotEmpty()
    @IsString()
    lastName: string;

    @IsEmail()
    @IsString()
    email: string;

    @IsNotEmpty()
    @IsString()
    phoneNumber: string;

    @IsNotEmpty()
    @IsString()
    username: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    signupCode: string;

    @IsBoolean()
    termsAndConditionAccepted: boolean;

    @IsBoolean()
    companyPolicyAccepted: boolean;

    @IsBoolean()
    freightBroker: boolean;
}