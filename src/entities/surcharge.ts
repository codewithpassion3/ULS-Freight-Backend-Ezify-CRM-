import { Entity, PrimaryKey, Property, ManyToOne, types, Enum } from '@mikro-orm/core';
import { IsEnum } from 'class-validator';
import { Shipment } from './shipment.entity';
import { Currency } from 'src/common/enum/currency.enum';
import { Carrier } from "src/modules/shipment-carrier/dto/create-carrier-shipment.dto";
import { Invoice } from './invoice.entity';

@Entity()
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

  @Property({ length: 50, nullable: true})
  comment?: string;

  @Enum(() => Currency)
  @IsEnum(Currency)
  currency!: Currency;

  @Property({ default: false})
  isAddedByAdmin?: Boolean;

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  createdAt?: Date;

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date;

  @ManyToOne(() => Invoice, { nullable: true, hidden: true })
  invoice?: Invoice;
}