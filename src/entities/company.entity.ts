import { Entity, OneToOne, PrimaryKey, Property} from '@mikro-orm/core'
import { Address } from './address.entity';

@Entity()
export class Company{
    @PrimaryKey()
    id!: number;

    @Property()
    name!: string;

    @OneToOne(() => Address)
    address: Address;

}