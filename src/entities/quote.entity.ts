import { Entity, PrimaryKey, Enum, Property, OneToMany, Collection, OneToOne, ManyToOne, BeforeCreate } from "@mikro-orm/core";
import { Currency } from "src/common/enum/currency.enum";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { Insurance } from "./insurance.entity";
import { LineItem } from "./line-item.entity";
import { ShippingAddress } from "./shipping-address.entity";
import { SpotDetails } from "./spot-details.entity";
import { Signature } from "./signature.entity";
import { StandardPalletServices } from "./standard-pallet-services.entity";
import { SpotFtlServices } from "./spot-ftl-services.entity";
import { SpotLtlServices } from "./spot-ltl-services.entity";
import { StandardFTLServices } from "./standard-ftl-services.entity";
import { User } from "./user.entity";
import { QuoteUserMeta } from "./quote-user-meta.entity";
import { randomBytes } from "crypto";

@Entity()
export class Quote {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  quoteId!: string;

  @BeforeCreate()
  generateQuoteId() {
    this.quoteId = randomBytes(4).toString('hex').toUpperCase();
  }
  
  @Enum(() => QuoteType)
  quoteType!: QuoteType;

  @Enum(() => ShipmentType)
  shipmentType!: ShipmentType;

  @Property({ nullable: true })
  knownShipper?: boolean | null;

  @Property({ nullable: true })
  description?: string | null;

  @Property({ onCreate: () => new Date() })
  createdAt = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt = new Date();
  
  @ManyToOne(() => User)
  createdBy! : User;

  @OneToMany(() => QuoteUserMeta, meta => meta.quote)
  userMeta = new Collection<QuoteUserMeta>(this);
  
  @OneToMany(() => ShippingAddress, addr => addr.quote)
  addresses = new Collection<ShippingAddress>(this);

  @OneToOne(() => LineItem, item => item.quote, { nullable: true, mappedBy: 'quote' })
  lineItems?: LineItem

  @OneToOne(() => SpotDetails, spot => spot.quote, { nullable: true })
  spotDetails?: SpotDetails;

  @OneToOne(() => Insurance, ins => ins.quote, { nullable: true })
  insurance?: Insurance;

  @OneToOne(() => Signature, signature => signature.quote, { nullable: true })
  signature?: Signature | null;

   /* -------------------- SERVICES -------------------- */
   @OneToOne(() => StandardFTLServices, standardFTL => standardFTL.quote, {
    nullable: true,
    mappedBy: 'quote',
    orphanRemoval: true,
  })
  standardFTLService?: StandardFTLServices;

  @OneToOne(() => StandardPalletServices, pallet => pallet.quote, {
    nullable: true,
    mappedBy: 'quote',
    orphanRemoval: true,
  })
  palletServices?: StandardPalletServices;

  @OneToOne(() => SpotFtlServices, spotFTL => spotFTL.quote, {
    nullable: true,
    mappedBy: 'quote',
    orphanRemoval: true,
  })
  spotFtlServices?: SpotFtlServices;

  @OneToOne(() => SpotLtlServices, spotLTL => spotLTL.quote, {
    nullable: true,
    mappedBy: 'quote',
    orphanRemoval: true,
  })
  spotLtlServices?: SpotLtlServices;
}