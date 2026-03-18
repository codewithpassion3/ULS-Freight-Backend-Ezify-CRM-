import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class Signatrue{
    @PrimaryKey()
    id!: number;

    @Property({ unique: true })
    type!: string;

    @Property({ unique: true })
    name!: string;
}