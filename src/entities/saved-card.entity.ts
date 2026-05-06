import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { User } from './user.entity';
import { v4 } from 'uuid';

@Entity({ tableName: 'saved_cards' })
export class SavedCard {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => User, { index: true })
  user!: User;

  @Property()
  @Index()
  stripePaymentMethodId?: string;

  @Property()
  stripeCustomerId?: string;

  @Property()
  brand?: string;

  @Property()
  last4?: string;

  @Property()
  expMonth?: number;

  @Property()
  expYear?: number;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}