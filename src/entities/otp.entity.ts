import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class OTP {

  @PrimaryKey()
  id!: number;

  @Index()
  @Property()
  email!: string;

  @Property()
  code!: string;

  @Property()
  expiresAt!: Date;

  @Property()
  purpose!: string;

  @Property({ default: false })
  used?: boolean = false;

  @Property({ default: 0 })
  retries?: number = 0;

  @Property({ nullable: true})
  blockedUntil?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();
}