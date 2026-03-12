import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { OtpPurpose } from "src/common/enum/otp-purpose.enum";

export class GenerateOtpDTO {
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @IsEnum(OtpPurpose)
    purpose!: OtpPurpose
}