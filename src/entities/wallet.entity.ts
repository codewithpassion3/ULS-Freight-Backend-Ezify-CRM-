import { Entity, PrimaryKey, Property, ManyToOne, Index, Unique, OneToOne } from '@mikro-orm/core';
import { User } from './user.entity';

@Entity()
export class Wallet {
  @PrimaryKey()
  id!: number;

  @OneToOne(() => User, { hidden: true, owner: true, unique: true })
  user!: User;

  @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance?: number = 0;

  @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDeposited?: number = 0;

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();
}