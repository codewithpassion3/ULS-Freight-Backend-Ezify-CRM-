import { Entity, PrimaryKey, ManyToOne, Property } from "@mikro-orm/core";
import { LineItem } from "./line-item.entity";

@Entity()
export class LineItemUnit {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => LineItem, { hidden: true })
  lineItem!: LineItem;

  // Common fields (only include what's truly shared)
  @Property()
  weight!: number | null;

  @Property({ nullable: true })
  length?: number | null;

  @Property({ nullable: true })
  width?: number | null;

  @Property({ nullable: true })
  height?: number | null;

  // Pallet-specific
  @Property({ nullable: true })
  stackable?: boolean | null;

  // Package-specific
  @Property({ nullable: true })
  quantity?: number | null;

  // Package-specific
  @Property({ nullable: true })
  freightClass?: string | null;

  // Pallet-specific
  @Property({ nullable: true })
  nmfc?: string | null ;

}