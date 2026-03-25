import { Entity, PrimaryKey, OneToOne, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class FTLDetails {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote)
  quote!: Quote;

  @Property()
  looseFreight!: boolean;

  @Property()
  pallets!: boolean;
}