import { Entity, PrimaryKey, Enum, Property, OneToMany, Collection, OneToOne } from "@mikro-orm/core";
import { Currency } from "src/common/enum/currency.enum";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { Insurance } from "./insurance.entity";
import { LineItem } from "./line-item.entity";
import { ShippingAddress } from "./shipping-address.entity";
import { SpotDetails } from "./spot-details.entity";

@Entity()
export class Quote {

  @PrimaryKey()
  id!: number;

  @Enum(() => QuoteType)
  quoteType!: QuoteType;

  @Enum(() => ShipmentType)
  shipmentType!: ShipmentType;

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ nullable: true })
  signature?: number;

  @Property({ onCreate: () => new Date() })
  createdAt = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt = new Date();

  @OneToMany(() => ShippingAddress, addr => addr.quote)
  addresses = new Collection<ShippingAddress>(this);

  @OneToMany(() => LineItem, item => item.quote)
  lineItems = new Collection<LineItem>(this);

  @OneToOne(() => SpotDetails, spot => spot.quote, { nullable: true })
  spotDetails?: SpotDetails;

  @OneToOne(() => Insurance, ins => ins.quote, { nullable: true })
  insurance?: Insurance;
}