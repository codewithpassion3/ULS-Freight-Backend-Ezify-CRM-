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

  @Property({ type: 'boolean', default: false })
  isFavourite!: boolean;

  @Property({ type: 'boolean', default: false })
  isSaved!: boolean;
}