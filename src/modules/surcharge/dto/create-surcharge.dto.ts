import { 
  IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty, 
  IsArray, ArrayMinSize, ValidateNested, Length 
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from 'src/common/enum/currency.enum';

// ── Individual item inside the array ──
export class SurchargeItemDto {
  @IsString()
  @Length(1, 30)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  comment!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsEnum(Currency)
  currency!: Currency;
}


export class CreateSurchargeDto {
  @IsNotEmpty()
  shipmentId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SurchargeItemDto)
  surcharges!: SurchargeItemDto[];
}