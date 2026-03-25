import { Entity, PrimaryKey, ManyToOne, Property, DateTimeType, Unique } from "@mikro-orm/core";
import { User } from "./user.entity";
import { AddressBook } from "./address-book.entity";

@Entity()
@Unique({ properties: ["user", "addressBook"] })
export class UserAddressBookUsage {
    @PrimaryKey()
    id!: number;

    @ManyToOne(() => User, { hidden: true })
    user!: User;

    @ManyToOne(() => AddressBook)
    addressBook!: AddressBook;

    @Property({ onCreate: () => new Date(), type: DateTimeType, defaultRaw: "CURRENT_TIMESTAMP" })
    lastUsedAt?: Date;

    @Property({ onCreate: () => new Date(), type: DateTimeType, defaultRaw: "CURRENT_TIMESTAMP" })
    createdAt?: Date;
}