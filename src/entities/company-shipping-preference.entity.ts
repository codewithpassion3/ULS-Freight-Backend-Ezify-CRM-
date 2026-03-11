import { Entity, Enum, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Company } from "./company.entity";
import { ShippingType } from "src/common/enum/shipping-type.enum";
import { PackageShipmentVolume, PalletShipmentVolume } from "src/common/enum/shipment-volume.enum";

@Entity()
export class CompanyShippingPreference {
    @PrimaryKey()
    id!: number
    
    @ManyToOne(() => Company, {hidden: true})
    company!: Company

    @Enum(() => ShippingType)
    shippingType!: ShippingType;

    @Property({nullable: true})
    shippingVolume?: PackageShipmentVolume | PalletShipmentVolume;
}