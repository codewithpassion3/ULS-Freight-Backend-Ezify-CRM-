import { Entity, PrimaryKey, ManyToOne, Enum } from "@mikro-orm/core";
import { SpotDetails } from "./spot-details.entity";
import { EquipmentType } from "src/common/enum/equipment-type.enum";

@Entity()
export class SpotEquipment {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => SpotDetails)
  spot!: SpotDetails;

  @Enum(() => EquipmentType)
  type!: EquipmentType;
}