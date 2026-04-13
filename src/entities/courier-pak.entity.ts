import { Entity, PrimaryKey, OneToOne, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";

@Entity()
export class CourierPak {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote)
  quote!: Quote;

  @Property()
  weight!: number;

  @Property({ nullable: true })
  description?: string;
}