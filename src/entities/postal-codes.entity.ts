import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class PostalCode {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  postalCode!: string;

  @Property()
  placeName!: string;

  @Property()
  country!: string;

  @Property()
  fsaProvince!: string;
}