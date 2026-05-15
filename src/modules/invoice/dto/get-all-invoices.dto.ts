// src/modules/invoice/dto/get-all-invoices.dto.ts
import { IsOptional, IsString, IsDateString, IsBooleanString } from 'class-validator';

export class GetAllInvoicesQueryParams {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string; // invoice number, tracking number, or location

  @IsOptional()
  @IsBooleanString()
  paid?: string;

  @IsOptional()
  @IsBooleanString()
  urgent?: string;

  @IsOptional()
  @IsString()
  bookedBy?: string; // email partial match

  @IsOptional()
  @IsString()
  shipmentType?: string;
}