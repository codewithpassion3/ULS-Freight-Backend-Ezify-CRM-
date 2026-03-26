import { Entity, PrimaryKey, Property, OneToOne, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class SpotLtlServices {
  @PrimaryKey()
  id!: number;

  @Property({ default: false })
  inbound!: boolean;

  @Property({ default: false })
  protectFromFreeze!: boolean;

  @Property({ default: false })
  limitedAccess!: boolean;

  @OneToOne(() => Quote, {
    owner: true,
    cascade: [Cascade.REMOVE]
  })
  quote!: Quote;
}