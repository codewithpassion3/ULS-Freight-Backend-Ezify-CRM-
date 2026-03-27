import {
  ValidateNested,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateAddressDto,
  CreateInsuranceDto,
  CreateLineItemDto,
  CreateSpotDetailsDto,
} from './create-quote.dto';
import { QuoteType } from 'src/common/enum/quote-type.enum';
import { ShipmentType } from 'src/common/enum/shipment-type.enum';
import { PalletServices } from 'src/entities/pallet-services.entity';
import { SpotFtlServices } from 'src/entities/spot-ftl-services.entity';
import { SpotLtlServices } from 'src/entities/spot-ltl-services.entity';
import { StandardFtlServices } from 'src/entities/standard-ftl-services.entity';

export class UpdateQuoteDTO {
  @IsOptional()
  @IsEnum(QuoteType)
  quoteType?: QuoteType;

  @IsOptional()
  @IsEnum(ShipmentType)
  shipmentType?: ShipmentType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses?: CreateAddressDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLineItemDto)
  lineItem?: CreateLineItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInsuranceDto)
  insurance?: CreateInsuranceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSpotDetailsDto)
  spotDetails?: CreateSpotDetailsDto;

  @IsOptional()
  @IsNumber()
  signature?: number;

  @IsOptional()
  services?: SpotFtlServices | SpotLtlServices | StandardFtlServices | PalletServices;
}