import { IsOptional, IsString } from "class-validator";

export class UpdateCompanyDTO {

  // Company fields
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  industryType?: string;

  // Address fields
  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  address1?: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}