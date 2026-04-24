import { Entity, PrimaryKey, Property, OneToOne, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { BondType, ContactKey } from "src/common/enum/services.enum";

@Entity()
export class PalletServices {
  @PrimaryKey()
  id!: number;

  @Property({ type: "JSON", default: null, nullable: true })
  inBound?: {
    "bondType"?: BondType,
    "bondCancler"?: string,
    "address"?: string,
    "contactKey"?: ContactKey,
    "contactValue"?: string
  };
  
  @Property({ default: "", nullable: false })
  limitedAccess?: string = "";

  @Property({ default: "", nullable: false })
  limitedAccessDescription?: string = "";

  @Property({ default: false, nullable: false })
  appointmentDelivery?: boolean = false;

  @Property({ default: false, nullable: false })
  thresholdDelivery?: boolean = false;

  @Property({ default: false, nullable: false })
  thresholdPickup?: boolean = false;

  @Property({ default: false, nullable: false })
  amazonOrFbaDelivery?: boolean = false;

  @Property({ default: false, nullable: false })
  tradeShowDelivery?: boolean = false;

  @Property({ default: false, nullable: false })
  protectFromFreeze?: boolean = false;

  @OneToOne(() => Quote, { hidden: true })
  quote!: Quote;
}