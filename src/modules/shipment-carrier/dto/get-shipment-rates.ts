import {
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WeightUnit, DimensionsUnit, PickupType, RateRequestType, FedExServiceType } from 'src/common/enum/shipment-carriers';
import { ShipmentType } from '../adapter/fedex.adaptar';


class AccountNumberDTO {
  @IsString()
  @IsNotEmpty()
  value!: string;
}

class AddressDTO {
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  stateOrProvinceCode!: string;
}

class PackageDTO {
  @IsEnum(WeightUnit)
  weightUnit!: WeightUnit;

  @IsEnum(DimensionsUnit)
  dimensionsUnit!: DimensionsUnit;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  width!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  height!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  length!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  handlingUnits?: number;

  @IsOptional()
  @IsString()
  packaging?: string;

  @IsOptional()
  @IsString()
  subPackagingType?: string;
}

export class GetShipmentRatesDTO {
  @ValidateNested()
  @Type(() => AccountNumberDTO)
  accountNumber!: AccountNumberDTO;

  @IsEnum(ShipmentType)
  shipmentType!: ShipmentType;

  @ValidateNested()
  @Type(() => AddressDTO)
  from!: AddressDTO;

  @ValidateNested()
  @Type(() => AddressDTO)
  to!: AddressDTO;

  @IsEnum(PickupType)
  pickupType!: PickupType;

  @IsArray()
  @IsEnum(RateRequestType, { each: true })
  rateRequestType!: RateRequestType[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageDTO)
  packages!: PackageDTO[];

  @IsOptional()
  @IsEnum(FedExServiceType)
  serviceType?: FedExServiceType;
}