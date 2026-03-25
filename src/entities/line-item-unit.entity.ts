import { Entity, PrimaryKey, ManyToOne, Property } from "@mikro-orm/core";
import { LineItem } from "./line-item.entity";

@Entity()
export class LineItemUnit {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => LineItem)
  lineItem!: LineItem;

  // Common fields (only include what's truly shared)
  @Property()
  weight!: number;

  @Property({ nullable: true })
  length?: number;

  @Property({ nullable: true })
  width?: number;

  @Property({ nullable: true })
  height?: number;

  // Pallet-specific
  @Property({ nullable: true })
  stackable?: boolean;

  // Package-specific
  @Property({ nullable: true })
  quantity?: number;
}