import { Entity, PrimaryKey, Property, OneToOne, Cascade, Index } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()

@Index({ properties: ['quote'] })

export class SpotLtlServices {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, {
    owner: true,
    cascade: [Cascade.REMOVE]
  })
  quote!: Quote;
}