import { Collection, Entity, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { AddressBook } from "./address-book.entity";
import { ShippingAddress } from "./shipping-address.entity";

@Entity()
export class PalletShippingLocationType {
    @PrimaryKey()
    id!: number;

    @Property({ unique:  true })
    locationType!: string;

    @Property({ unique: true })
    name!: string;

    @OneToMany(() => AddressBook, addressBook => addressBook.locationType)
    addressBook? = new Collection<AddressBook>(this);

    @OneToMany(() => ShippingAddress, shippingAddress => shippingAddress.locationType)
    shippingAddress? = new Collection<ShippingAddress>(this);
}