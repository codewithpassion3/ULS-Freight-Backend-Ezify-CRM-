import {
  IsString,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuoteType {
  STANDARD = 'STANDARD',
  SPOT = 'SPOT',
}

export enum PickupType {
  DROPOFF_AT_FEDEX_LOCATION = 'DROPOFF_AT_FEDEX_LOCATION',
  CONTACT_FEDEX_TO_SCHEDULE = 'CONTACT_FEDEX_TO_SCHEDULE',
  USE_SCHEDULED_PICKUP = 'USE_SCHEDULED_PICKUP',
}

export enum ServiceType {
  FEDEX_EXPRESS_SAVER = 'FEDEX_EXPRESS_SAVER',
  FEDEX_GROUND = 'FEDEX_GROUND',
  FEDEX_2_DAY = 'FEDEX_2_DAY',
  STANDARD_OVERNIGHT = 'STANDARD_OVERNIGHT',
}

export enum RateRequestType {
  LIST = 'LIST',
  ACCOUNT = 'ACCOUNT',
  PREFERRED = 'PREFERRED',
}

export enum WeightUnit {
  LB = 'LB',
  KG = 'KG',
}

export enum DimensionsUnit {
  IN = 'IN',
  CM = 'CM',
}

export enum Packaging {
  BOX = 'BOX',
  FEDEX_ENVELOPE = 'FEDEX_ENVELOPE',
  FEDEX_PAK = 'FEDEX_PAK',
  FEDEX_TUBE = 'FEDEX_TUBE',
  YOUR_PACKAGING = 'YOUR_PACKAGING',
}

// ─── Address ─────────────────────────────────────

class AddressDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  postalCode!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;
}

// ─── FedEx Location ──────────────────────────────

class FedExLocationDto {
  @IsString()
  postalCode!: string;

  @IsString()
  countryCode!: string;
}

// ─── FedEx Section ─────────────────────────────────

class FedExDto {
  @ValidateNested()
  @Type(() => FedExLocationDto)
  from!: FedExLocationDto;

  @ValidateNested()
  @Type(() => FedExLocationDto)
  to!: FedExLocationDto;
}

// ─── TST Section ───────────────────────────────────

class TSTDto {
  @ValidateNested()
  @Type(() => AddressDto)
  from!: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  to!: AddressDto;
}

// ─── Package ───────────────────────────────────────

class PackageDto {
  @IsEnum(WeightUnit)
  weightUnit!: WeightUnit;

  @IsNumber()
  @Min(0.1)
  weight!: number;

  @IsEnum(DimensionsUnit)
  dimensionsUnit!: DimensionsUnit;

  @IsNumber()
  @Min(1)
  length!: number;

  @IsNumber()
  @Min(1)
  width!: number;

  @IsNumber()
  @Min(1)
  height!: number;

  @IsNumber()
  @Min(1)
  handlingUnits!: number;

  @IsEnum(Packaging)
  packaging!: Packaging;
}

// ─── Main DTO ──────────────────────────────────────

export class ShipmentRatesStreamDto {
  @IsEnum(QuoteType)
  quoteType!: QuoteType;

  @IsObject()
  @ValidateNested()
  @Type(() => FedExDto)
  fedex!: FedExDto;

  @IsObject()
  @ValidateNested()
  @Type(() => TSTDto)
  tst!: TSTDto;

  @IsEnum(PickupType)
  pickupType!: PickupType;

  @IsEnum(RateRequestType, { each: true })
  @IsArray()
  @ArrayMinSize(1)
  rateRequestType!: RateRequestType[];

  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  @ArrayMinSize(1)
  packages!: PackageDto[];
}