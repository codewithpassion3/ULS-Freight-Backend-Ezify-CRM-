import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Quote } from 'src/entities/quote.entity';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Severity } from 'src/common/enum/severity.enum';
import { EntityType } from 'src/common/enum/entity-type.enum';
import { NotificationData } from 'src/types/notification';


@Injectable()
export class QuoteNotificationFactory {
  constructor(private readonly em: EntityManager) {}

  create(
    quote: Quote, 
    type: 'created' | 'updated' | 'deleted' | 'expired',
    actorId: number
  ): NotificationData {
    const templates = {
      created: {
        title: 'New Quote Created',
        message: `Quote #${quote.id} has been created`,
        severity: Severity.NORMAL,
        type: NotificationType.QUOTE_CREATED
      },
      updated: {
        title: 'Quote Updated',
        message: `Quote #${quote.id} has been modified`,
        severity: Severity.NORMAL,
        type: NotificationType.QUOTE_UPDATED
      },
      deleted: {
        title: 'Quote Deleted',
        message: `Quote #${quote.id} has been removed`,
        severity: Severity.HIGH,
        type: NotificationType.QUOTE_DELETED
      },
      expired: {
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
        actionUrl: `/quotes/${quote.id}`,
        metaData: {
          quoteNumber: quote.id,
          status: quote.status
        }
      },
      actorId,
      channels: ['in_app']
    };
  }

  async getRecipients(quote: Quote, excludeUserId?: number): Promise<number[]> {
    // Get company members who should receive quote notifications
    const members = await this.em.find('User', {
      company: quote.company.id,
      // id: excludeUserId ? { $ne: excludeUserId } : undefined
    }, { fields: ['id'] });
    console.log({members})
    return members.map(m => m.id);
  }
}