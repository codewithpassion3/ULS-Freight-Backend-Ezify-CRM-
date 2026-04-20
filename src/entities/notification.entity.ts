import { Cascade, Collection, Entity, Enum, OneToMany, PrimaryKey, Property } from "@mikro-orm/core";
import { Severity } from "src/common/enum/severity.enum";
import { EntityType } from "src/common/enum/entity-type.enum";
import { UserNotification } from "./user-notification.entity";
import { NotificationType } from "src/common/enum/notification-type.enum";

@Entity()
export class Notification {
    @PrimaryKey()
    id!: number;

    @Enum(() => NotificationType)
    type!: NotificationType;
    
    @Enum(() => Severity)
    severity!: Severity;

    @Property({ type: "jsonb"})
    payload!: {
        title: string;
        message: string;
        actionUrl?: string;
        entityType?: EntityType;
        entityId?: number;
        metaData?: Record<string, any>
    }

    @Property()
    actorId?: number;

    @Property({ onCreate: () => new Date()})
    createdAt?: Date

    @Property({ onCreate: () => new Date(), onUpdate: () => new Date()})
    updatedAt?: Date

    @OneToMany(() => UserNotification, un => un.notification, {
        cascade: [Cascade.REMOVE],
        orphanRemoval: true
    })
    userNotifications = new Collection<UserNotification>(this);
}