import { IsInt, IsOptional, IsString, IsBoolean, IsEnum } from "class-validator";
import { LineItemUnitType } from "src/common/enum/line-item-unit-type";
import { MeasurementUnits } from "src/common/enum/measurement-units.enum";
import { ShipmentType } from "src/common/enum/shipment-type.enum";

export class UpdateLineItemUnitDTO {
  @IsInt()
  @IsOptional()
  weight?: number;

  @IsInt()
  @IsOptional()
  length?: number;

  @IsInt()
  @IsOptional()
  width?: number;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsInt()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  freightClass?: string;

  @IsString()
  @IsOptional()
  nmfc?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  unitsOnPallet?: number;

  @IsBoolean()
  @IsOptional()
  specialHandlingRequired?: boolean;

  @IsEnum(LineItemUnitType)
  @IsOptional()
  palletUnitType?: LineItemUnitType

  @IsEnum(MeasurementUnits)
  @IsOptional()
  measurementUnit?: MeasurementUnits

  @IsString()
  @IsOptional()
  name?: string 
    
  @IsEnum(
    {
      PALLET: ShipmentType.PALLET,
      COURIER_PAK: ShipmentType.COURIER_PAK,
      PACKAGE: ShipmentType.PACKAGE,
    },
    {
      message: "shipmentType must be one of: PALLET, COURIER_PAK, PACKAGE",
    }
  )
  shipmentType!: ShipmentType;
}
