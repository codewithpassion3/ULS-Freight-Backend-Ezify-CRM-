import { Entity, PrimaryKey, ManyToOne, Property, Index } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { User } from "./user.entity";
import { Company } from "./company.entity";

@Entity()

@Index({ properties: ['quote'] })

export class QuoteFavorite {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Company)
  company!: Company

  @ManyToOne(() => Quote)
  quote!: Quote;

  @Property({ onCreate: () => new Date() })
  createdAt? = new Date();

  @Property({ onCreate: () => new Date, onUpdate: () => new Date})
  updatedAt? = new Date();
}