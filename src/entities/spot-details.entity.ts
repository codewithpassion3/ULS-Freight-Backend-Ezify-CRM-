import { Entity, PrimaryKey, OneToOne, Enum } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { SpotType } from "src/common/enum/spot-type.enum";

@Entity()
export class SpotDetails {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => Quote)
  quote!: Quote;

  @Enum(() => SpotType)
  spotType!: SpotType;
}