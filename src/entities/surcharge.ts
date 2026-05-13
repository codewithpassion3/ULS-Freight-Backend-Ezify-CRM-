import { Entity, PrimaryKey, Property, ManyToOne, types, Enum } from '@mikro-orm/core';
import { IsEnum } from 'class-validator';
import { Shipment } from './shipment.entity';
import { Currency } from 'src/common/enum/currency.enum';
import { Carrier } from "src/modules/shipment-carrier/dto/create-carrier-shipment.dto";

@Entity({ tableName: 'surcharges' })
export class Surcharge {
  @PrimaryKey({ type: types.uuid, defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Shipment, { hidden: true, index: true })
  shipment!: Shipment;

  @Enum(() => Carrier)
  carrier!: Carrier;

  @Property({ length: 30 })
  name!: string;

  @Property({ type: types.decimal, precision: 10, scale: 2 })
  amount!: number;

  @Enum(() => Currency)
  @IsEnum(Currency)
  currency!: Currency;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}