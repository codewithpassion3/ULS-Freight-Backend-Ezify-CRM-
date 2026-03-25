import { Entity, PrimaryKey, OneToOne, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class Insurance {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote)
  quote!: Quote;

  @Property()
  amount!: number;
}