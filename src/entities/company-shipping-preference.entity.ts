import { Entity, Enum, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Company } from "./company.entity";
import { ShippingType } from "src/common/enum/shipping-type.enum";
import { ShipmentVolume } from "src/common/enum/shipment-volume.enum";

@Entity()
export class CompanyShippingPreference {
    @PrimaryKey()
    id!: number

    @ManyToOne(() => Company)
    company!: Company

    @Enum(() => ShippingType)
    shippingType!: ShippingType;

    @Enum(() => ShipmentVolume)
    shippingVolume?: ShipmentVolume;
}