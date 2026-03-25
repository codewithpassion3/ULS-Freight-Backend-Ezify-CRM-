import { Entity, Enum, ManyToOne, OneToOne, PrimaryKey } from "@mikro-orm/core";
import { AddressType } from "src/common/enum/address-type.enum";
import { AddressBook } from "./address-book.entity";
import { Quote } from "./quote.entity";
import { ShippingAddressMeta } from "./shipping-address-meta.entity";
import { Address } from "./address.entity";

@Entity()
export class ShippingAddress{
    @PrimaryKey()
    id!: number;

    @Enum(() => AddressType)
    type!: 'FROM' | 'TO';

    @ManyToOne(() => Quote)
    quote!: Quote;

    //Use AddressBook ID if user picks from address book
    @ManyToOne(() => AddressBook, { nullable: true })
    addressBookEntry?: AddressBook;

    //If user inputs manually
    @OneToOne(() => Address, { nullable: true })
    address?: Address;

    // Optional metadata (FTL / Spot fields)
    @OneToOne(() => ShippingAddressMeta, meta => meta.shippingAddress, { nullable: true })
    meta?: ShippingAddressMeta;
}