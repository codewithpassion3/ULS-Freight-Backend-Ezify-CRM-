import { Cascade, Entity, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { User } from "./user.entity";

@Entity()
export class QuoteUserMeta {
  @PrimaryKey()
  id!: number;
  
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Quote)
  quote!: Quote;

  @Property({ default: false })
  isFavourite!: boolean;

  @Property({ default: false })
  isSaved!: boolean;
}