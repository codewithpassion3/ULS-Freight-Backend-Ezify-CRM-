import { Cascade, Collection, DateTimeType, Entity, ManyToOne, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Address } from "./address.entity";
import { User } from "./user.entity";
import { Signatrue } from "./signature.entity";
import { PalletShippingLocationType } from "./pallet-shipping-location-type";
import { UserAddressBookUsage } from "./user-address-book-usage.entity";

@Entity()
export class AddressBook {
    @PrimaryKey()
    id!: number;

    @Property({ unique: true })
    companyName!: string;

    @Property({ nullable: true })
    contactId?: string;

    @Property()
    contactName!: string;

    @Property({ unique: true })
    phoneNumber!: string;

    @Property({ unique: true, nullable: true })
    email?: string;

    @Property({ nullable: true })
    defaultInstructions?: string;

    @Property()
    palletShippingReadyTime!: string;

    @Property()
    palletShippingCloseTime!: string;

    @Property({ default: false })
    isDeleted?: boolean;

    @Property({ onCreate: () => new Date()})
    createAt?: Date;

    @Property({ onUpdate: () => new Date()})
    upatedAt?: Date;

    @ManyToOne(() => User, { nullable: true })
    deletedBy?: User;

    @ManyToOne(() => User, { nullable: false })
    createdBy!: User;

    @ManyToOne(() => User, { nullable: true })
    updatedBy?: User;

    @OneToMany(() => UserAddressBookUsage, usage => usage.addressBook)
    userUsages = new Collection<UserAddressBookUsage>(this);
    
    @ManyToOne(() => Signatrue, { nullable: false })
    signature!: Signatrue;

    @ManyToOne(() => PalletShippingLocationType, { nullable: false })
    locationType!: PalletShippingLocationType;

    @OneToOne(() => Address, { nullable: false, owner: true, cascade: [Cascade.ALL] })
    address!: Address;
}