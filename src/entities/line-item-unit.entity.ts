import { Entity, PrimaryKey, ManyToOne, Property, Cascade, OneToOne, Enum } from "@mikro-orm/core";
import { LineItem } from "./line-item.entity";
import { User } from "./user.entity";
import { LineItemUnitType } from "src/common/enum/line-item-unit-type";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { MeasurementUnits } from "src/common/enum/measurement-units.enum";

@Entity()
export class LineItemUnit {

  @PrimaryKey()
  id!: number;

  @Enum(() => ShipmentType)
  type!: ShipmentType;

  @Property({ nullable: true })
  @Enum(() => MeasurementUnits)
  measurementUnit?: MeasurementUnits;

  @Property({ nullable: true})
  name?: string | null;

  @ManyToOne(() => LineItem, { hidden: true, nullable: true})
  lineItem?: LineItem;

  @Property({ type: 'int', nullable: true })
  weight?: number | null;

  @Property({ type: 'int', nullable: true })
  length?: number | null;

  @Property({ type: 'int', nullable: true })
  width?: number | null;

  @Property({ type: 'int', nullable: true })
  height?: number | null;

  @Property({ nullable: true })
  freightClass?: string | null;

  @Property({ nullable: true })
  nmfc?: string | null;

  @Property({ nullable: true })
  description?: string | null;

  @Property({ type: 'int', nullable: true })
  unitsOnPallet?: number | null;

  @Property({ nullable: true })
  specialHandlingRequired?: boolean | null;

  @Property({nullable: true})
  @Enum(() => LineItemUnitType)
  palletUnitType?: LineItemUnitType | null;

  @ManyToOne(() => User, { nullable: false })
  createdBy!: User;
}