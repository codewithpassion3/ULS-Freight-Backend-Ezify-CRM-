import { Entity, PrimaryKey, OneToOne, Property, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { MeasurementUnits } from "src/common/enum/measurement-units.enum";

@Entity()
export class StandardFtlServices {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, { hidden: true, owner: true, cascade: [Cascade.REMOVE] })
  quote!: Quote;

  @Property({ type: 'json', nullable: true})
  looseFreight?: {
    field?: 'looseFreight' | 'pallets'
    pieceCount?: number;
    totalWeight?: number;
    measurementUnit?: MeasurementUnits
    description?: string;
  }
}