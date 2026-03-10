import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class Address{
    @PrimaryKey()
    id!: number;

    @Property()
    address1!: string;

    @Property({nullable: true})
    unit?: string;

    @Property()
    postalCode!: string;

    @Property()
    city!: string;

    @Property()
    state!: string;

    @Property()
    country!: string;
}