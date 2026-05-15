import { Entity, PrimaryKey, Property, OneToOne, Cascade, Index } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()

@Index({ properties: ['quote'] })

export class SpotFtlServices {
  @PrimaryKey()
  id!: number;

  @Property({ default: false })
  dangerousGoods!: boolean;

  @Property({ default: false })
  stackable!: boolean;

  @OneToOne(() => Quote, {
    owner: true,
    cascade: [Cascade.REMOVE],
  })
  quote!: Quote;
}