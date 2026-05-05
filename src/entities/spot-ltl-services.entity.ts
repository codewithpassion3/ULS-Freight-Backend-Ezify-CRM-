import { Entity, PrimaryKey, Property, OneToOne, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class SpotLtlServices {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, {
    owner: true,
    cascade: [Cascade.REMOVE]
  })
  quote!: Quote;
}