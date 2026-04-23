import { IsString, IsDateString, IsBoolean, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum Carrier {
  FEDEX = 'FEDEX',
  TST = 'TST',
}

class SelectedRateDto {
  @IsString()
  serviceType!: string;

  @IsString()
  @IsOptional()
  serviceName?: string;

  @IsString()
  @IsOptional()
  packagingType?: string;

  @IsNumber()
  totalCharge!: number;

  @IsString()
  currency!: string;

  @IsNumber()
  @IsOptional()
  transitDays?: number;
}

export class CreateCarrierShipmentDTO {
  @IsNumber()
  quoteId!: number;

  @IsEnum(Carrier)
  carrier!: Carrier;

  @ValidateNested()
  @Type(() => SelectedRateDto)
  selectedRate!: SelectedRateDto;

  @IsDateString()
  @IsOptional()
  shipDate?: string;

  @IsBoolean()
  @IsOptional()
  tailgatePickup?: boolean;

  @IsBoolean()
  @IsOptional()
  tailgateDelivery?: boolean;

  @IsString()
  @IsOptional()
  pickupType?: string;
}