import { Entity, PrimaryKey, OneToOne, Property } from "@mikro-orm/core";
import { SpotDetails } from "./spot-details.entity";

@Entity()
export class SpotContact {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => SpotDetails)
  spot!: SpotDetails;

  @Property()
  contactName!: string;

  @Property()
  phoneNumber!: string;

  @Property()
  email!: string;

  @Property()
  shipDate!: Date;

  @Property()
  deliveryDate!: Date;

  @Property({ nullable: true })
  spotQuoteName?: string;
}