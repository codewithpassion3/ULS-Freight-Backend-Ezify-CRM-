import { Entity, Enum, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { User } from "./user.entity";
import { ReminderStatus } from "src/common/enum/reminder.enum";

@Entity()
export class Reminder {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property()
  message!: string;

  @Property()
  scheduledAt!: Date;

  @ManyToOne(() => User)
  sendTo!: User;

  @Enum(() => ReminderStatus)
  @Property({  nullable: false, default: ReminderStatus.PENDING })
  status?: ReminderStatus;

  @Property({ nullable: true })
  bullJobId?: string;

  @ManyToOne(() => User)
  createdBy!: User;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}