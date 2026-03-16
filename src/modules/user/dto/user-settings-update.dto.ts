import { IsOptional, IsString, IsIn } from "class-validator";

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
  @IsString()
  dark_mode?: string;
}