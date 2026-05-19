import { Entity, PrimaryKey, OneToOne, Property, Enum, Cascade, Index } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { Currency } from "src/common/enum/currency.enum";

@Entity()

@Index({ properties: ['quote'] })

export class Insurance {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, { hidden: true, cascade: [Cascade.REMOVE]})
  quote!: Quote;

  @Property({ type: 'int'})
  amount!: number;

  @Enum(() => Currency)
  @Property({ default: Currency.USD})
  currency?: Currency = Currency.USD; 
}