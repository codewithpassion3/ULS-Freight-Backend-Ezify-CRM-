import { Entity, PrimaryKey, Property, OneToOne, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { BondType, ContactKey } from "src/common/enum/services.enum";
import { TRADE_SHOW_DELIVERY } from "src/common/enum/quote";

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
  limitedAccessDescription?: string | null = "" ;

  @Property({ default: false, nullable: false })
  appointmentDelivery?: boolean = false;

  @Property({ default: false, nullable: false })
  thresholdDelivery?: boolean = false;

  @Property({ default: false, nullable: false })
  thresholdPickup?: boolean = false;

  @Property({ type: "JSON", default: null, nullable: true })
  amazonOrFbaDelivery?: {
    isBeingCheckedInStandardQuote: boolean,
    appointmentScheduledAlready: boolean,
    appointmentDate: Date,
    appointmentTime: string,
    fba: string,
    orderId: string
  }

  @Property({ type: "JSON", default: null, nullable: true })
  tradeShowDelivery?: {
    isBeingCheckedInStandardQuote: boolean,
    appointmentDeliveryRequired: boolean,
    deliveryTo: TRADE_SHOW_DELIVERY
    moveInDate: Date,
    tradeShowName: string,
    tradeShowBooth: string,
    contactName: string,
    contactNumber: string,
    generalInstructions: string
  }

    @Property({ type: "JSON", default: null, nullable: true })
    groceryDistributionCenter?: {
      facilityName: string,
      orderId: string,
      hasAppointmentAlreadyBeenScheduled: boolean,
      appointmentPortal: string,
      additionalRemarks: string
    }

  @Property({ default: false, nullable: false })
  protectFromFreeze?: boolean = false;

  @OneToOne(() => Quote, { hidden: true })
  quote!: Quote;
}