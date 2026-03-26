import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNumber,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

import { QuoteType } from 'src/common/enum/quote-type.enum';
import { ShipmentType } from 'src/common/enum/shipment-type.enum';
import { Currency } from 'src/common/enum/currency.enum';
import { AddressType } from 'src/common/enum/address-type.enum';
import { SpotFtlServices } from 'src/entities/spot-ftl-services.entity';
import { SpotLtlServices } from 'src/entities/spot-ltl-services.entity';
import { StandardFTLServices } from 'src/entities/standard-ftl-services.entity';
import { StandardPalletServices } from 'src/entities/standard-pallet-services.entity';

/* ---------------- ADDRESS ---------------- */

export class CreateAddressDto {
  @IsEnum(AddressType)
  type!: AddressType;

  @IsOptional()
  @IsNumber()
  addressBookId?: number;

  // Location type
  @IsOptional()
  @IsNumber()
  locationType?: number;

  // Required only if addressBookId is NOT provided
  @IsOptional()
  @IsBoolean()
  isResidential?: boolean;

  @IsOptional()
  @IsString()
  address1?: string;

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

  // FTL only
  @IsOptional()
  @IsBoolean()
  includeStraps?: boolean;

  @IsOptional()
  @IsBoolean()
  appointmentDelivery?: boolean;

  // Spot only
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

/* ---------------- LINE ITEM UNIT ---------------- */

export class CreateLineItemUnitDto {
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  // Pallet specific
  @IsOptional()
  @IsString()
  freightClass?: string;

  @IsOptional()
  @IsString()
  nmfc?: string;

  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @IsOptional()
  @IsNumber()
  unitsOnPallet?: number;
}

/* ---------------- LINE ITEM ---------------- */

export class CreateLineItemDto {
  @IsEnum(ShipmentType)
  type!: ShipmentType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemUnitDto)
  units!: CreateLineItemUnitDto[];

  @IsOptional()
  @IsBoolean()
  dangerousGoods?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

/* ---------------- INSURANCE ---------------- */

export class CreateInsuranceDto {
  @IsNumber()
  amount!: number;

  @IsEnum(Currency)
  currency!: Currency;
}

/* ---------------- SPOT DETAILS ---------------- */

export class CreateSpotDetailsDto {
  @IsString()
  contactName!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  email!: string;

  @IsString()
  shipDate!: string;

  @IsString()
  deliveryDate!: string;

  @IsOptional()
  @IsString()
  spotQuoteName?: string;

  @IsOptional()
  @IsString()
  equipmentType?: string;

  @IsOptional()
  @IsBoolean()
  knownShipper?: boolean;
}

/* ---------------- ROOT DTO ---------------- */

export class CreateQuoteDTO {
  @IsEnum(QuoteType)
  quoteType!: QuoteType;

  @IsEnum(ShipmentType)
  shipmentType!: ShipmentType;

  @IsOptional()
  @IsNumber()
  signature?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses!: CreateAddressDto[];

  @ValidateNested()
  @Type(() => CreateLineItemDto)
  lineItem?: CreateLineItemDto;

  @ValidateNested()
  @Type(() => CreateInsuranceDto)
  insurance?: CreateInsuranceDto;

  @ValidateNested()
  @Type(() => CreateSpotDetailsDto)
  spotDetails?: CreateSpotDetailsDto;

  @IsOptional()
  services?: SpotFtlServices | SpotLtlServices | StandardFTLServices | StandardPalletServices;
}