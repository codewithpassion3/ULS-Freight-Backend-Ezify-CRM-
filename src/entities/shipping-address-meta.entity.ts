import { Entity, PrimaryKey, OneToOne, Property } from "@mikro-orm/core";
import { ShippingAddress } from "./shipping-address.entity";

@Entity()
export class ShippingAddressMeta {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => ShippingAddress)
  shippingAddress!: ShippingAddress;

  // Only for FTL / special shipping
  @Property({ nullable: true })
  includeStraps?: boolean;

  @Property({ nullable: true })
  appointmentDelivery?: boolean;

  // Only for Spot / additional notes
  @Property({ nullable: true })
  additionalNotes?: string;
}