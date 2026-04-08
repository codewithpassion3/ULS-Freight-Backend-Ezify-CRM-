import { Collection, Entity, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Shipment } from "./shipment.entity";


@Entity()
export class BillingReference {
    @PrimaryKey()
    id!: number
        
    @Property({ nullable: false })
    code!: string;

    @Property({ onCreate: () => new Date()})
    createdAt?: Date

    @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
    updatedAt?: Date

    @ManyToOne(() => Shipment)
    shipment!: Shipment
}