import { Entity, PrimaryKey, ManyToOne, Enum, OneToMany, Collection, OneToOne, Property, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { LineItemUnit } from "./line-item-unit.entity";
import { MeasurementUnits } from "src/common/enum/measurement-units.enum";

@Entity()
export class LineItem {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, { owner: true, hidden: true, cascade: [Cascade.REMOVE] })
  quote!: Quote;

  @Enum(() => ShipmentType)
  type!: ShipmentType;

  @Enum(() => MeasurementUnits)
  measurementUnit!: MeasurementUnits
  
  @Property({  type: 'boolean', nullable: true })
  dangerousGoods?: boolean | null;

  @Property({ type: 'boolean', nullable: true })
  stackable?: boolean | null;

  @Property({ type: 'int', nullable: true })
  quantity?: number | null;

  @OneToMany(() => LineItemUnit, unit => unit.lineItem)
  units = new Collection<LineItemUnit>(this);
}