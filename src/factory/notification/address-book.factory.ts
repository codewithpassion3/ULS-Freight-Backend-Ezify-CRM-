import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Severity } from 'src/common/enum/severity.enum';
import { EntityType } from 'src/common/enum/entity-type.enum';
import { AddressBook } from 'src/entities/address-book.entity';
import { NotificationData } from 'src/types/notification';

@Injectable()
export class AddressNotificationFactory {
  constructor(private readonly em: EntityManager) {}

  create(
    addressBook: AddressBook,
    type: 'created' | 'updated' | 'deleted',
    actorId: number
  ): NotificationData {
    const templates = {
      created: {
        title: 'New Address Added',
        message: `Address "${addressBook.address.address1}" has been added to address book`,
        severity: Severity.LOW,
        type: NotificationType.ADDRESSBOOK_CREATED
        
      },
      updated: {
        title: 'Address Updated',
        message: `Address "${addressBook.address.address1}" has been modified`,
        severity: Severity.LOW,
        type: NotificationType.ADDRESSBOOK_UPDATED
      },
      deleted: {
        title: 'Address Removed',
        message: `An address has been removed from address book`,
        severity: Severity.NORMAL,
        type: NotificationType.ADDRESSBOOK_DELETED
      }
    };

    const template = templates[type];

    return {
      type: NotificationType[`ADDRESS_${type.toUpperCase()}` as keyof typeof NotificationType],
      severity: template.severity,
      payload: {
        title: template.title,
        message: template.message,
        entityType: EntityType.ADDRESS_BOOK,
        entityId: addressBook.id,
        actionUrl: `/address-book/${addressBook.id}`,
        metaData: {
          address1: addressBook.address.address1,
          potalCode: addressBook.address.postalCode,
          city: addressBook.address.city,
          country: addressBook.address.country,
        }
      },
      actorId,
      channels: ['in_app']
    };
  }

  // async getRecipients(address: Address, excludeUserId?: number): Promise<number[]> {
  //   // Address book changes usually notify company members
  //   const members = await this.em.find('User', {
  //     companyId: address,
  //     isActive: true,
  //     id: excludeUserId ? { $ne: excludeUserId } : undefined
  //   }, { fields: ['id'] });

  //   return members.map(m => m.id);
  // }
}