import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDTO {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "Phone number must be in international format (e.g., +923001234567)"
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  username?: string;
}