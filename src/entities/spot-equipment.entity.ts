import { Entity, PrimaryKey, OneToOne, Property, Cascade } from "@mikro-orm/core";
import { SpotDetails } from "./spot-details.entity";

export type REFRIGERATED = 'FROZEN' | 'FRESH';
@Entity()
export class SpotEquipment {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => SpotDetails, spot => spot.spotEquipment,{ hidden: true, owner: true, cascade: [Cascade.REMOVE] })
  spotDetail!: SpotDetails;
  
  @Property({ nullable: true})
  truck?: boolean | null

  @Property({ nullable: true})
  car?: boolean | null

  @Property({ nullable: true})
  van?: boolean | null

  @Property({ nullable: true})
  dryVan?: boolean | null

 @Property({ nullable: true, type: 'json' })
  refrigerated?: {
    type: REFRIGERATED;
  } | null;

  @Property({ nullable: true})
  flatbed?: boolean | null

  @Property({ nullable: true})
  ventilated?: boolean | null

  @Property({ type: 'json', nullable: true })
  nextFlightOut?: {
    knownShipper?: boolean;
  } | null;
}