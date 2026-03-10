import { Entity, Enum, ManyToOne, PrimaryKey } from "@mikro-orm/core";
import { Company } from "./company.entity";
import { ShippingType } from "src/common/enum/shipping-type.enum";
import { ShipmentVolume } from "src/common/enum/shipment-volume.enum";
import { IsOptional } from "class-validator";

@Entity()
export class CompanyShippingPreference {
    @PrimaryKey()
    id!: number
    
    @ManyToOne(() => Company, {hidden: true})
    company!: Company

    @Enum(() => ShippingType)
    shippingType!: ShippingType;

    @Enum({items: () => ShipmentVolume, nullable: true})
    shippingVolume?: ShipmentVolume;
}