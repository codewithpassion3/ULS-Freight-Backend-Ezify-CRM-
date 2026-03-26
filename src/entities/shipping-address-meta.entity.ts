import { Entity, PrimaryKey, OneToOne, Property, Cascade } from "@mikro-orm/core";
import { ShippingAddress } from "./shipping-address.entity";

@Entity()
export class ShippingAddressMeta {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => ShippingAddress, { hidden: true, cascade: [Cascade.REMOVE] })
  shippingAddress!: ShippingAddress;

  // Only for FTL / special shipping
  @Property({ nullable: true })
  includeStraps?: boolean | null;

  @Property({ nullable: true })
  appointmentDelivery?: boolean |  null;

  // Only for Spot / additional notes
  @Property({ nullable: true })
  additionalNotes?: string | null;
}