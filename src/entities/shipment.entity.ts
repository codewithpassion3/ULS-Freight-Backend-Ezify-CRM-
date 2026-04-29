import { Cascade, Collection, Entity, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { BillingReference } from "./BillingReference.entity";
import { Currency } from "src/common/enum/currency.enum";

@Entity()
export class Shipment {
    @PrimaryKey()
    id!: number
    
    @Property()
    shipDate!: Date

    @Property({ onCreate: () => new Date()})
    createdAt?: Date

    @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
    updatedAt?: Date

    @Property({ nullable: true })
    tailgateRequiredInToAddress?: Boolean

    @Property({ nullable: true })
    tailgateRequiredInFromAddress?: Boolean

    @Property({ nullable: true })
    serviceType?: string;

    @Property({ default: 0 })
    totalCharge?: number

    @Property({ nullable: true })
    carrier?: string;

    @Property({ nullable: true })
    currency?: string;

    @Property({ nullable: true })
    carrierQuoteId?: string | null;

    @Property({ nullable: true })
    trackingNumber?: string | null;

    @Property({ nullable: true })
    serviceName?: string;
    
    @Property({ nullable: true })
    totalBaseCharge?: number;

    @Property({ nullable: true })
    totalFreightDiscounts?: number;

    @Property({ nullable: true })
    totalSurcharges?: number;

    @Property({ nullable: true })
    totalNetCharge?: number;

    @Property({ nullable: true })
    totalTax?: number;

    @Property({ nullable: true})
    shippingLabels?: string;

    @OneToOne(() => Quote, { nullable: false, owner: true, hidden: true })
    quote!: Quote;

    @OneToMany(() => BillingReference, billingReference => billingReference.shipment, { cascade: [Cascade.PERSIST, Cascade.REMOVE]})
    billingReferences = new Collection<BillingReference>(this); 
    shipmentType: any;
}