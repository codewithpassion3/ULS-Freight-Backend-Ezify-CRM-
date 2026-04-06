import { Entity, PrimaryKey, OneToOne, Property, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class StandardFtlServices {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, { owner: true, cascade: [Cascade.REMOVE] })
  quote!: Quote;

  @Property()
  looseFreight!: boolean;

  @Property()
  pallets!: boolean;
}