import { Entity, PrimaryKey, ManyToOne, Enum, OneToMany, Collection, OneToOne, Property } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { LineItemUnit } from "./line-item-unit.entity";

@Entity()
export class LineItem {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, { owner: true})
  quote!: Quote;

  @Enum(() => ShipmentType)
  type!: ShipmentType;

  @Property({ nullable: true })
  dangerousGoods?: boolean | null;

  @Property({ nullable: true })
  description?: string | null;

  @OneToMany(() => LineItemUnit, unit => unit.lineItem)
  units = new Collection<LineItemUnit>(this);
}