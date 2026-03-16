import { IsEmail, IsEnum, IsNotEmpty, IsString, Length } from "class-validator";
import { OtpPurpose } from "src/common/enum/otp-purpose.enum";

export class VerifyOtpDTO {
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @IsEnum(OtpPurpose)
    purpose!: OtpPurpose

    @IsNotEmpty()
    @IsString()
    @Length(6,6)
    code!: string;
}