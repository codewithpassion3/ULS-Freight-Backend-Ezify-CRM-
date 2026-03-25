import { Entity, PrimaryKey, OneToOne, Enum, Property } from "@mikro-orm/core";
import { SpotEquipment } from "./spot-equipment.entity";
import { TemperatureType } from "src/common/enum/temperature-type";

@Entity()
export class RefrigeratedDetails {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => SpotEquipment)
  equipment!: SpotEquipment;

  @Enum(() => TemperatureType)
  temperatureType!: TemperatureType;

  @Property({ nullable: true })
  protectFromFreeze?: boolean;
}