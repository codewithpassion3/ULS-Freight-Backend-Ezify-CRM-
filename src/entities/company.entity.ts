import { Collection, Entity, OneToMany, OneToOne, PrimaryKey, Property} from '@mikro-orm/core'
import { Address } from './address.entity';
import { CompanyShippingPreference } from './company-shipping-preference.entity';
import { AddressBook } from './address-book.entity';
import { LineItemUnit } from './line-item-unit.entity';

@Entity()
export class Company{
    @PrimaryKey()
    id!: number;

    @Property()
    name!: string;

    @Property({ nullable: true})
    industryType?: string;

    @OneToOne(() => Address)
    address!: Address;

    @OneToMany(() => CompanyShippingPreference, pref => pref.company)
    shippingPreferences = new Collection<CompanyShippingPreference>(this);

    @OneToMany(() => AddressBook, addressBook => addressBook.company)
    addressBook = new Collection<AddressBook>(this);

    @OneToMany(() => LineItemUnit, lineItemUnit => lineItemUnit.company)
    lineItemUnit = new Collection<LineItemUnit>(this);
}