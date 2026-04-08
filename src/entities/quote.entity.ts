import { Entity, PrimaryKey, Enum, Property, OneToMany, Collection, OneToOne, ManyToOne, BeforeCreate, Cascade } from "@mikro-orm/core";
import { Currency } from "src/common/enum/currency.enum";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { Insurance } from "./insurance.entity";
import { LineItem } from "./line-item.entity";
import { ShippingAddress } from "./shipping-address.entity";
import { SpotDetails } from "./spot-details.entity";
import { Signature } from "./signature.entity";
import { PalletServices } from "./pallet-services.entity";
import { SpotFtlServices } from "./spot-ftl-services.entity";
import { SpotLtlServices } from "./spot-ltl-services.entity";
import { StandardFtlServices } from "./standard-ftl-services.entity";
import { User } from "./user.entity";
import { QuoteUserMeta } from "./quote-user-meta.entity";
import { randomBytes } from "crypto";
import { QuoteStatus } from "src/common/enum/quote-status";
import { QuoteFavorite } from "./quote-favorite.entity";
import { Company } from "./company.entity";

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

  @Enum(() => QuoteStatus)
  status!: QuoteStatus;

  @Property({ nullable: true })
  description?: string | null;

  @Property({ onCreate: () => new Date() })
  createdAt = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt = new Date();
  
  @ManyToOne(() => User)
  createdBy! : User;

  @OneToMany(() => QuoteUserMeta, meta => meta.quote, { cascade: [Cascade.REMOVE] })
  userMeta = new Collection<QuoteUserMeta>(this);
  
  @OneToMany(() => ShippingAddress, addr => addr.quote, { cascade: [Cascade.REMOVE] })
  addresses = new Collection<ShippingAddress>(this);

  @OneToOne(() => LineItem, item => item.quote, { nullable: true, mappedBy: 'quote' })
  lineItems?: LineItem

  @OneToOne(() => SpotDetails, spot => spot.quote, { nullable: true })
  spotDetails?: SpotDetails;

  @OneToOne(() => Insurance, ins => ins.quote, { nullable: true })
  insurance?: Insurance;

  @OneToOne(() => Signature, { nullable: true })
  signature?: Signature | null;

  @OneToMany(() => QuoteFavorite, fav => fav.quote, { cascade: [Cascade.REMOVE] })
  favorites = new Collection<QuoteFavorite>(this);

  /* -------------------- SERVICES -------------------- */
  @OneToOne(() => StandardFtlServices, standardFTL => standardFTL.quote, {
    nullable: true,
    mappedBy: 'quote',
  })
  standardFTLService?: StandardFtlServices;

  @OneToOne(() => PalletServices, pallet => pallet.quote, {
    nullable: true,
    mappedBy: 'quote',
  })
  palletServices?: PalletServices;

  @OneToOne(() => SpotFtlServices, spotFTL => spotFTL.quote, {
    nullable: true,
    mappedBy: 'quote',
  })
  spotFtlServices?: SpotFtlServices;

  @OneToOne(() => SpotLtlServices, spotLTL => spotLTL.quote, {
    nullable: true,
    mappedBy: 'quote',
  })
  spotLtlServices?: SpotLtlServices;

  @ManyToOne(() => Company)
  company!: Company;
}