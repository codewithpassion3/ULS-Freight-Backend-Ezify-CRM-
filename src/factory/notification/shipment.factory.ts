import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Shipment } from 'src/entities/shipment.entity';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Severity } from 'src/common/enum/severity.enum';
import { EntityType } from 'src/common/enum/entity-type.enum';
import { NotificationData } from 'src/types/notification';

@Injectable()
export class ShipmentNotificationFactory {
  constructor(private readonly em: EntityManager) {}

  create(
    shipment: Shipment,
    type: 'created' | 'updated' | 'deleted' | 'status_changed',
    actorId: number,
    context?: { oldStatus?: string; newStatus?: string }
  ): NotificationData {
    const templates = {
      created: {
        title: 'New Shipment Created',
        message: `Shipment #${shipment.id} is pending`,
        severity: Severity.NORMAL,
        type: NotificationType.SHIPMENT_CREATED
      },
      updated: {
        title: 'Shipment Updated',
        message: `Shipment #${shipment.id} details changed`,
        severity: Severity.NORMAL,
        type: NotificationType.SHIPMENT_UPDATED
      },
      deleted: {
        title: 'Shipment Cancelled',
        message: `Shipment #${shipment.id} has been cancelled`,
        severity: Severity.HIGH,
        type: NotificationType.SHIPMENT_DELETED
      },
      status_changed: {
        title: `Shipment ${context?.newStatus || 'Status Changed'}`,
        message: `Shipment #${shipment.id} is now ${context?.newStatus}`,
        severity: this.getSeverityForStatus(context?.newStatus)
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
        actionUrl: `/shipments/${shipment.id}`,
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

  // async getRecipients(shipment: Shipment, excludeUserId?: number): Promise<number[]> {
  //   // Shipment recipients: customer + assigned ops team + company admins
  //   const recipients = new Set<number>();

  //   // Add customer
  //   // if (shipment.customerId) {
  //   //   recipients.add(shipment.customerId);
  //   // }


  //   // Add company admins (optional - customize as needed)
  //   const admins = await this.em.find('User', {
  //     companyId: shipment.quote.company.id,
  //     role: 'admin',
  //     isActive: true
  //   }, { fields: ['id'] });
    
  //   admins.forEach(admin => recipients.add(admin.id));

  //   // Remove excluded user (the actor)
  //   if (excludeUserId) {
  //     recipients.delete(excludeUserId);
  //   }

  //   return Array.from(recipients);
  // }

  private getSeverityForStatus(status?: string): Severity {
    switch (status?.toLowerCase()) {
      case 'delayed':
      case 'exception':
        return Severity.URGENT;
      case 'delivered':
        return Severity.NORMAL;
      case 'in_transit':
        return Severity.LOW;
      default:
        return Severity.NORMAL;
    }
  }
}