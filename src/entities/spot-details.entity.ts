import { Entity, PrimaryKey, OneToOne, Enum, OneToMany, Cascade } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { SpotType } from "src/common/enum/spot-type.enum";
import { SpotContact } from "./spot-contact.entity";
import { SpotEquipment } from "./spot-equipment.entity";

@Entity()
export class SpotDetails {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote, {cascade: [Cascade.REMOVE]})
  quote!: Quote;

  @Enum(() => SpotType)
  spotType!: SpotType;

  @OneToOne(() => SpotContact)
  spotContact?: SpotContact;

  @OneToMany(() => SpotEquipment, spotEquipment => spotEquipment.spotDetail, { nullable: true })
  spotEquipment?: SpotEquipment;
}