import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateProfileByAdminDTO {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsNumber()
  roleId: number;

  @IsOptional()
  @IsArray()
  permissionIds: number[];
}