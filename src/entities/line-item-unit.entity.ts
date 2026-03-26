import { Entity, PrimaryKey, ManyToOne, Property, Cascade } from "@mikro-orm/core";
import { LineItem } from "./line-item.entity";

@Entity()
export class LineItemUnit {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => LineItem, { hidden: true , cascade: [Cascade.REMOVE],})
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

  @Property({ nullable: true })
  quantity?: number | null;

  @Property({ nullable: true })
  freightClass?: string | null;

  @Property({ nullable: true })
  nmfc?: string | null;

  @Property({ nullable: true })
  description?: string | null;

  @Property({ nullable: true })
  unitsOnPallet?: number | null;

  @Property({ nullable: true })
  specialHandlingRequired?: boolean | null;
}