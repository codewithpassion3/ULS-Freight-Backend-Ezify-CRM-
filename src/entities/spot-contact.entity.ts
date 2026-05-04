import { Entity, PrimaryKey, OneToOne, Property, Cascade } from "@mikro-orm/core";
import { SpotDetails } from "./spot-details.entity";

@Entity()
export class SpotContact {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => SpotDetails, spot => spot.spotContact, { hidden: true, owner: true, cascade: [Cascade.REMOVE] })
  spotDetail!: SpotDetails;

  @Property()
  contactName!: string;

  @Property()
  phoneNumber!: string;

  @Property()
  email!: string;

  @Property()
  shipDate!: Date;

  @Property({ nullable: true })
  deliveryDate?: Date | null;

  @Property({ nullable: true })
  spotQuoteName?: string | null;
}