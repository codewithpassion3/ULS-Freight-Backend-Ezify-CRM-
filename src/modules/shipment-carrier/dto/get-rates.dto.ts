import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;          // maps to streetLines when hitting FedEx

  @IsString()
  postalCode!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  state?: string;            // maps to stateOrProvinceCode

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isResidential?: boolean;   // maps to residential
}

export class CarrierDTO {
  @ValidateNested()
  @Type(() => AddressDTO)
  from!: AddressDTO;

  @ValidateNested()
  @Type(() => AddressDTO)
  to!: AddressDTO;
}

export class PackageDTO {
  @IsString() weightUnit?: string;
  @IsString() weight?: number;
  @IsString() dimensionsUnit?: string;
  @IsString() length?: number;
  @IsString() width?: number;
  @IsString() height?: number;
  @IsString() handlingUnits?: number;
  @IsString() packaging?: string;
}

export class GetRatesDTO {
  @IsString() quoteType!: string;

  // Dynamic carriers — all optional, but if present, from/to are mandatory
  @IsOptional() @ValidateNested() @Type(() => CarrierDTO) fedex?: CarrierDTO;
  @IsOptional() @ValidateNested() @Type(() => CarrierDTO) tst?: CarrierDTO;
  @IsOptional() @ValidateNested() @Type(() => CarrierDTO) tforce?: CarrierDTO;
  @IsOptional() @ValidateNested() @Type(() => CarrierDTO) xpo?: CarrierDTO;

  @IsOptional() @IsString() pickupType?: string;
  @IsOptional() rateRequestType?: string[];
  @IsString() shipmentType?: string;

  @IsOptional() services?: any;

  @ValidateNested({ each: true })
  @Type(() => PackageDTO)
  packages!: PackageDTO[];
}