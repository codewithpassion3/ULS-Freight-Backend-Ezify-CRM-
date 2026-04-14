import { Entity, PrimaryKey, ManyToOne, Property, Index } from "@mikro-orm/core";
import { User } from "./user.entity";
import { Notification } from "./notification.entity";

  
@Entity()
export class UserNotification {
  @PrimaryKey()
  id!: number

  @ManyToOne(() => Notification)
  notification!: Notification;

  @ManyToOne(() => User, { nullable: true }) // nullable if you want soft refs
  user?: User;

  @Property({ default: false })
  read: boolean = false;

  @Property({ nullable: true })
  readAt?: Date;

  @Property({ type: 'jsonb', nullable: true })
  deliveryStatus?: {
    sse?: { sentAt: Date; deliveredAt?: Date };
    email?: { sentAt: Date; error?: string };
  };

  @Property({ onCreate: () => new Date()})
  createdAt?: Date;
}