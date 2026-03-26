import { Cascade, Entity, Enum, ManyToOne, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { AddressType } from "src/common/enum/address-type.enum";
import { AddressBook } from "./address-book.entity";
import { Quote } from "./quote.entity";
import { ShippingAddressMeta } from "./shipping-address-meta.entity";
import { Address } from "./address.entity";
import { PalletShippingLocationType } from "./pallet-shipping-location-type.entity";

@Entity()
export class ShippingAddress{
    @PrimaryKey()
    id!: number;

    @Enum(() => AddressType)
    type!: AddressType;

    @ManyToOne(() => Quote, { hidden: true, cascade: [Cascade.REMOVE] })
    quote!: Quote;

    //Use AddressBook ID if user picks from address book
    @ManyToOne(() => AddressBook, { nullable: true })
    addressBookEntry?: AddressBook | null;

    //If user inputs manually
    @OneToOne(() => Address, { nullable: true , cascade: [Cascade.REMOVE]})
    address?: Address | null;

    //For SPOT quote
    @ManyToOne(() => PalletShippingLocationType, { nullable: true })
    locationType?: PalletShippingLocationType | null;
    
    @Property({ nullable: true})
    isResidential?: boolean | null;

    // Optional metadata (FTL / Spot fields)
    @OneToOne(() => ShippingAddressMeta, meta => meta.shippingAddress, { nullable: true })
    meta?: ShippingAddressMeta | null;
}