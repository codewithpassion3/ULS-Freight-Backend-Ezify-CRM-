import { Entity, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class Signature{
    @PrimaryKey()
    id!: number;

    @Property({ unique: true })
    type!: string;

    @Property({ unique: true })
    name!: string;

    @OneToMany(() => Quote, (quote) => quote.signature)
    quotes?: Quote[];
}