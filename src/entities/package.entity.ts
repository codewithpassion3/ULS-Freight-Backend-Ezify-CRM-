import { Entity, PrimaryKey, ManyToOne, Property } from "@mikro-orm/core";
import { LineItem } from "./line-item.entity";

@Entity()
export class Package {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => LineItem)
  lineItem!: LineItem;

  @Property()
  quantity!: number;

  @Property()
  length!: number;

  @Property()
  width!: number;

  @Property()
  height!: number;

  @Property()
  weight!: number;

  @Property({ nullable: true })
  description?: string;

  @Property()
  specialHandling!: boolean;

  @Property()
  dangerousGoods!: boolean;
}