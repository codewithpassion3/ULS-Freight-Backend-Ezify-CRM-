import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Shipment } from 'src/entities/shipment.entity';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Severity } from 'src/common/enum/severity.enum';
import { EntityType } from 'src/common/enum/entity-type.enum';
import { NotificationActionType, NotificationData } from 'src/types/notification';

@Injectable()
export class ShipmentNotificationFactory {
  constructor(private readonly em: EntityManager) {}

  create(
    shipment: Shipment,
    type: keyof typeof NotificationActionType,
    actorId: number,
    context?: { oldStatus?: string; newStatus?: string }
  ): NotificationData {
    const templates = {
      [NotificationActionType.CREATED]: {
        title: 'New Shipment Created',
        message: `Shipment #${shipment.id} is created`,
        severity: Severity.NORMAL,
        type: NotificationType.SHIPMENT_CREATED
      },
      [NotificationActionType.UPDATED]: {
        title: 'Shipment Updated',
        message: `Shipment #${shipment.id} details changed`,
        severity: Severity.NORMAL,
        type: NotificationType.SHIPMENT_UPDATED
      }
    };

    const template = templates[type];

    return {
      type: NotificationType[`SHIPMENT_${type.toUpperCase()}` as keyof typeof NotificationType],
      severity: template.severity,
      payload: {
        title: template.title,
        message: template.message,
        entityType: EntityType.SHIPMENT,
        entityId: shipment.id,
        metaData: {
          shipmentId: shipment.id,
          shipDate: shipment.shipDate,
          ...(context && { statusChange: `${context.oldStatus} → ${context.newStatus}` })
        }
      },
      actorId,
      channels: ['in_app']
    };
  }
}