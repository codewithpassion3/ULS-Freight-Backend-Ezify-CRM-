import { IsOptional, IsString, IsBoolean, IsIn } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  default_landing_page?: string;

  @IsOptional()
  @IsString()
  home_quick_button?: string;

  @IsOptional()
  @IsIn(["en", "fr"])
  language?: string;

  @IsOptional()
  @IsBoolean()
  dark_mode?: boolean;
}