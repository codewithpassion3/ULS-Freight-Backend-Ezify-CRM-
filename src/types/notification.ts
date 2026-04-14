import { NotificationType } from "src/common/enum/notification-type.enum";
import { Severity } from "src/common/enum/severity.enum";
import { EntityType } from "src/common/enum/entity-type.enum";

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