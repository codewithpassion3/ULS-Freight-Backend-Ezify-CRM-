import { Entity, PrimaryKey, ManyToOne, Property } from "@mikro-orm/core";
import { LineItem } from "./line-item.entity";

@Entity()
export class Pallet {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => LineItem)
  lineItem!: LineItem;

  @Property()
  length!: number;

  @Property()
  width!: number;

  @Property()
  height!: number;

  @Property()
  weight!: number;

  @Property()
  freightClass!: string;

  @Property()
  nmfc!: string;

  @Property()
  stackable!: boolean;
}