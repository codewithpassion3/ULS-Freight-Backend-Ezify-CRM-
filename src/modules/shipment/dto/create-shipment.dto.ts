// dto/create-shipment.dto.ts
import { IsDateString, IsBoolean, IsEnum, IsArray, ValidateNested, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ShipmentType } from 'src/common/enum/shipment-type.enum';
import { CreateQuoteDTO } from 'src/modules/quote/dto/create-quote.dto';
import { Mode } from 'src/common/enum/mode.enum';

export class CreateShipmentDTO {
    @IsEnum(Mode)
    mode!: Mode
    
    @IsDateString()
    shipDate!: string;

    @IsEnum(ShipmentType)
    shipmentType!: ShipmentType;

    @ValidateNested()
    @Type(() => CreateQuoteDTO)
    quote!: CreateQuoteDTO;

    @IsBoolean()
    @IsOptional()
    tailgateRequiredInToAddress?: boolean;

    @IsBoolean()
    @IsOptional()
    tailgateRequiredInFromAddress?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    billingReferences?: string[];
}