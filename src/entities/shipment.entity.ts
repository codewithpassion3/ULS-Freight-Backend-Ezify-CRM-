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

    @Property()
    currency?: string;

    @Property({ nullable: true })
    carrierQuoteId?: string | null;

    @Property({ nullable: true })
    trackingNumber?: string | null;

    @Property()
    serviceName!: string;
    
    @Property()
    totalBaseCharge!: number;

    @Property()
    totalFreightDiscounts!: number;

    @Property()
    totalSurcharges!: number;

    @Property()
    totalNetCharge!: number;

    @Property()
    totalTax!: number;

    @Property()
    shippingLabels!: string;

    @OneToOne(() => Quote, { nullable: false, owner: true, hidden: true })
    quote!: Quote;

    @OneToMany(() => BillingReference, billingReference => billingReference.shipment, { cascade: [Cascade.PERSIST, Cascade.REMOVE]})
    billingReferences = new Collection<BillingReference>(this); 
    shipmentType: any;
}