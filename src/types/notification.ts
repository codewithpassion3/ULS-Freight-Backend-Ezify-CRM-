import { NotificationType } from "src/common/enum/notification-type.enum";
import { Severity } from "src/common/enum/severity.enum";
import { EntityType } from "src/common/enum/entity-type.enum";
import { EntityManager } from "@mikro-orm/core";

export interface NotificationData {
  type: NotificationType;
  severity: Severity;
  payload: {
    title: string;
    message: string;
    actionUrl?: string;
    entityType?: EntityType;
    entityId?: number;
    metaData?: Record<string, any>;
  };
  actorId?: number;
  channels?: ('in_app' | 'email' | 'push')[];
  expiresAt?: Date;
}

export interface EntityEventPayload<T = any> {
  entity: T;
  actorId: number;
  companyId?: number;
  metadata?: Record<string, any>;
}

export enum NotificationActionType  {
    CREATED = "CREATED",
    UPDATED = "UPDATED",
    DELETED = "DELETED",
    EXPIRED = "EXPIRED"
}

export interface NotificationBroadcastParams {
  notificationData: NotificationData, 
  recipients: number[],
  entityManager: EntityManager

}

export interface GetNotificationParticipants {
  companyId: number, 
  excludeUserId?: number, 
  em?: EntityManager
}