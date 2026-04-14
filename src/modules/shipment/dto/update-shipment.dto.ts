// dto/create-shipment.dto.ts
import { IsDateString, IsBoolean, IsEnum, IsArray, IsString, IsOptional } from 'class-validator';
import { ShipmentType } from 'src/common/enum/shipment-type.enum';
import { Mode } from 'src/common/enum/mode.enum';

export class UpdateShipmentDTO {
    @IsEnum(Mode)
    mode!: Mode
    
    @IsOptional()
    @IsDateString()
    shipDate?: string;

    @IsEnum(ShipmentType)
    shipmentType!: ShipmentType;

    @IsOptional()
    quote?: Record<string, any>;

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