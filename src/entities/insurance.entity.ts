import { Entity, PrimaryKey, OneToOne, Property, Enum, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { Currency } from "src/common/enum/currency.enum";

@Entity()
export class Insurance {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, { cascade: [Cascade.REMOVE]})
  quote!: Quote;

  @Property()
  amount!: number;

  @Enum(() => Currency)
  currency!: Currency; 
}