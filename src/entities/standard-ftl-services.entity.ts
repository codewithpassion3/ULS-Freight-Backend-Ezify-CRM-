import { Entity, PrimaryKey, OneToOne, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class StandardFTLServices {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, { owner: true })
  quote!: Quote;

  @Property()
  looseFreight!: boolean;

  @Property()
  pallets!: boolean;
}