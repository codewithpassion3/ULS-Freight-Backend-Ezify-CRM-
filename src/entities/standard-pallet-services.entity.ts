import { Entity, PrimaryKey, Property, OneToOne } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class StandardPalletServices {
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

  @OneToOne(() => Quote, {
    owner: true,
  })
  quote!: Quote;
}