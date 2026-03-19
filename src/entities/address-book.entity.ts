import { Cascade, Collection, Entity, ManyToOne, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Address } from "./address.entity";
import { User } from "./user.entity";
import { Signature } from "./signature.entity";
import { PalletShippingLocationType } from "./pallet-shipping-location-type.entity";
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

    @Property({ default: false})
    isResidential?: boolean;

    @Property({ default: false })
    isDeleted?: boolean;

    @Property({ onCreate: () => new Date()})
    createdAt?: Date;

    @Property({ onCreate: () => new Date(), onUpdate: () => new Date()})
    updatedAt?: Date;

    @ManyToOne(() => User, { nullable: true })
    deletedBy?: User;

    @ManyToOne(() => User, { nullable: false })
    createdBy!: User;

    @ManyToOne(() => User, { nullable: true })
    updatedBy?: User;

    @OneToMany(() => UserAddressBookUsage, usage => usage.addressBook)
    userUsages? = new Collection<UserAddressBookUsage>(this);
    
    @ManyToOne(() => Signature, { nullable: false })
    signature!: Signature;

    @ManyToOne(() => PalletShippingLocationType, { nullable: false })
    locationType!: PalletShippingLocationType;

    @OneToOne(() => Address, { nullable: false, owner: true, cascade: [Cascade.ALL] })
    address!: Address;
}