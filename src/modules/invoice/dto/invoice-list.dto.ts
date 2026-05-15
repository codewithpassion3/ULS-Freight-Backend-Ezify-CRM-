// src/modules/invoice/dto/invoice-list.dto.ts
import { Expose, Transform, Type } from 'class-transformer';

export class QuoteDto {
  @Expose() id!: number;
  @Expose() shipmentType?: string;
  @Expose() lineItems?: Record<string,any>;
  @Expose() addresses?: any[];
}

export class BookedByDto {
  @Expose() id!: number;
  @Expose() email?: string;
  @Expose() firstName?: string;
  @Expose() lastName?: string;
}

export class ShipmentDto {
  @Expose() id!: number;
  @Expose() trackingNumber?: string;
  @Expose() shipDate?: Date;
  @Expose() @Type(() => QuoteDto) quote?: QuoteDto;
  @Expose() @Type(() => BookedByDto) bookedBy?: BookedByDto;
}

export class InvoiceListDto {
  @Expose() id!: number;
  @Expose() invoiceNumber!: string;
  @Expose() paid!: boolean;
  @Expose() urgent!: boolean;
  @Expose() createdAt!: Date;
  @Expose() dueDate!: Date;

  @Expose()
  @Type(() => ShipmentDto)
  shipment?: ShipmentDto;

  @Expose()
  @Transform(({ obj }) =>
    obj.surcharges?.reduce((sum: number, s: any) => sum + Number(s.amount), 0)
  )
  totalAmount!: number;

  @Expose()
  @Transform(({ obj }) => obj.surcharges?.[0]?.currency)
  currency!: string;
}