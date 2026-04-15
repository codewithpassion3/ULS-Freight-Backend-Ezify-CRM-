import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Quote } from 'src/entities/quote.entity';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Severity } from 'src/common/enum/severity.enum';
import { EntityType } from 'src/common/enum/entity-type.enum';
import { NotificationActionType, NotificationData } from 'src/types/notification';


@Injectable()
export class QuoteNotificationFactory {
  constructor(private readonly em: EntityManager) {}

  create(
    quote: Quote, 
    type: keyof typeof NotificationActionType,
    actorId: number
  ): NotificationData {
    const templates = {
      [NotificationActionType.CREATED]: {
        title: `New Quote Created`,
        message: `Quote #${quote.id} has been created`,
        severity: Severity.NORMAL,
        type: NotificationType.QUOTE_CREATED
      },
      [NotificationActionType.UPDATED]: {
        title: 'Quote Updated',
        message: `Quote #${quote.id} has been modified`,
        severity: Severity.NORMAL,
        type: NotificationType.QUOTE_UPDATED
      },
      [NotificationActionType.DELETED]: {
        title: 'Quote Deleted',
        message: `Quote #${quote.id} has been removed`,
        severity: Severity.HIGH,
        type: NotificationType.QUOTE_DELETED
      },
      [NotificationActionType.EXPIRED]: {
        title: 'Quote Expired',
        message: `Quote #${quote.id} has expired`,
        severity: Severity.URGENT,
        type: NotificationType.QUOTE_EXPIRED
      }
    };

    const template = templates[type];

    return {
      type: NotificationType[`QUOTE_${type.toUpperCase()}` as keyof typeof NotificationType],
      severity: template.severity,
      payload: {
        title: template.title,
        message: template.message,
        entityType: EntityType.QUOTE,
        entityId: quote.id,
        metaData: {
          status: quote.status,
          shipmentType: quote.shipmentType,
          signature: quote.signature
        }
      },
      actorId,
      channels: ['in_app']
    };
  }
}