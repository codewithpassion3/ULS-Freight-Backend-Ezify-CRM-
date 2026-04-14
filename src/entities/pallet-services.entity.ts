import { Entity, PrimaryKey, Property, OneToOne, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class PalletServices {
  @PrimaryKey()
  id!: number;

   @Property({ default: false })
  dangerousGoods!: boolean;

  @Property({ default: false })
  stackable!: boolean;
  
  @Property({ default: false })
  limitedAccess!: boolean;

  @Property({ default: false })
  appointmentDelivery!: boolean;

  @Property({ default: false })
  thresholdDelivery!: boolean;

  @Property({ default: false })
  thresholdPickup!: boolean;

  @Property({ default: false })
  amazonOrFbaDelivery!: boolean;

  @Property({ default: false })
  tradeShowDelivery!: boolean;

  @Property({ default: false })
  protectFromFreeze!: boolean;

  @OneToOne(() => Quote, {
    owner: true,
    cascade: [Cascade.REMOVE],
  })
  quote!: Quote;
}