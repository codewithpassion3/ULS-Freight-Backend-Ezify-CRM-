import { Cascade, Collection, Entity, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { BillingReference } from "./BillingReference.entity";

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
    
    @OneToOne(() => Quote, { nullable: false, owner: true, hidden: true })
    quote!: Quote;

    @OneToMany(() => BillingReference, billingReference => billingReference.shipment, { cascade: [Cascade.PERSIST, Cascade.REMOVE]})
    billingReferences = new Collection<BillingReference>(this); 

    
}