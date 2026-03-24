import { Entity, PrimaryKey, ManyToOne, Enum, OneToMany, Collection } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { LineItemUnit } from "./line-item-unit.entity";

@Entity()
export class LineItem {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Quote)
  quote!: Quote;

  @Enum(() => ShipmentType)
  type!: ShipmentType;

  @OneToMany(() => LineItemUnit, unit => unit.lineItem)
  units = new Collection<LineItemUnit>(this);
}