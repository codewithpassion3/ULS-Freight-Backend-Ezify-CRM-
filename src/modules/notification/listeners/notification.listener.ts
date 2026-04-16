import { EntityManager, MikroORM } from "@mikro-orm/core";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Quote } from "src/entities/quote.entity";
import { QuoteNotificationFactory } from "src/factory/notification/quote.factory";
import { GetNotificationParticipants, NotificationActionType, type EntityEventPayload } from "src/types/notification";
import { NotificationService } from "../service/notification.service";
import { NotificationType } from "src/common/enum/notification-type.enum";
import { Shipment } from "src/entities/shipment.entity";
import { ShipmentNotificationFactory } from "src/factory/notification/shipment.factory";
import { AddressBookNotificationFactory } from "src/factory/notification/address-book.factory";
import { AddressBook } from "src/entities/address-book.entity";

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notificationService: NotificationService,
    private quoteNotificationFactory: QuoteNotificationFactory,
    private shipmentNotificationFactory: ShipmentNotificationFactory,
    private addressBookNotificationFactory: AddressBookNotificationFactory,
    private orm: MikroORM
  ) {}

  private async handleEntityEvent<T>(
    payload: EntityEventPayload<T>,
    createNotification: (entity: T, actorId: number) => any,
    getRecipients: (companyId: number, actorId: number) => Promise<number[]>
  ) {
    try {
      const { companyId, entity, actorId } = payload;
      
      const notificationData = createNotification(entity, actorId);
      const recipients = await getRecipients(companyId as number, actorId);
      const em = this.orm.em.fork();
    
      await this.notificationService.broadcast({notificationData, recipients, entityManager: em});
      
      this.logger.debug(`Notification sent for ${notificationData.type} to ${recipients.length} recipients`);
    } catch (error) {
      // Log but don't throw - notifications shouldn't break business logic
      this.logger.error('Failed to send notification', error);
    }
  }

  private async getRecipients({companyId, excludeUserId, em}: GetNotificationParticipants): Promise<number[]> {
    // Get company members who should receive quote notifications
    const entityManager = em ?? this.orm.em;
    const members = await entityManager.find('User', {
      company: companyId,
      // id: excludeUserId ? { $ne: excludeUserId } : undefined
    }, { fields: ['id'] });
    return members.map(m => m.id);
  }

  //Quote
  @OnEvent(NotificationType.QUOTE_CREATED, { async: true })
  async handleQuoteCreated(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.CREATED, actorId),
      (companyId, actorId) => this.getRecipients({companyId: companyId as number, excludeUserId: actorId})
    );
  }

  @OnEvent(NotificationType.QUOTE_UPDATED, { async: true })
  async handleQuoteUpdated(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.UPDATED, actorId),
      (companyId, actorId) => this.getRecipients({ companyId: companyId as number, excludeUserId: actorId})
    );
  }

  @OnEvent(NotificationType.QUOTE_DELETED, { async: true })
  async handleQuoteDeleted(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
        payload,
        (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.DELETED, actorId),
        (companyId, actorId) => this.getRecipients({ companyId: companyId as number, excludeUserId: actorId})
    )
  }

  //Shipment
  @OnEvent(NotificationType.SHIPMENT_CREATED, { async: true })
  async handleShipmentCreated(payload: EntityEventPayload<Shipment>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.shipmentNotificationFactory.create(entity, NotificationActionType.CREATED, actorId),
      (companyId, actorId) => this.getRecipients({ companyId: companyId as number, excludeUserId: actorId })
    )
  }

  @OnEvent(NotificationType.SHIPMENT_UPDATED, { async: true })
  async handleShipmentUpdated(payload: EntityEventPayload<Shipment>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.shipmentNotificationFactory.create(entity as any, NotificationActionType.UPDATED, actorId),
      (companyId, actorId) => this.getRecipients({ companyId: companyId as number, excludeUserId: actorId })
    )
  }

  //Address Book
  @OnEvent(NotificationType.ADDRESSBOOK_CREATED, { async: true })
  async handleAddressBookCreated(payload: EntityEventPayload<AddressBook>) {
    const em = this.orm.em.fork();
    
    // Extract ID correctly - payload.entity is the full serialized entity from the event
    const entityId = (payload.entity as any)?.id ?? payload.entity;
    
    if (!entityId) {
      this.logger.error('No entity ID in payload');
      return;
    }

    // Load with populated relations (critical - factory needs address.address1)
    const addressBook = await em.findOne(
      AddressBook, 
      { id: entityId },
      { 
        populate: ['address', 'locationType', 'signature', 'createdBy', 'company'],
        refresh: true // Ensure we get latest data from DB, not stale cached state
      }
    );
    
    if (!addressBook) {
      this.logger.error(`AddressBook ${entityId} not found`);
      return;
    }

    // Pass forked EM to getRecipients if it queries the DB
    await this.handleEntityEvent(
      { ...payload, entity: addressBook },
      (entity, actorId) => this.addressBookNotificationFactory.create(
        entity as AddressBook, 
        NotificationActionType.CREATED, 
        actorId
      ),
      (companyId, actorId) => this.getRecipients({ companyId: companyId as number, excludeUserId: actorId, em }) // Pass EM here
    );
  }

  @OnEvent(NotificationType.ADDRESSBOOK_UPDATED, { async: true })
  async handleAddressBookUpdated(payload: EntityEventPayload<AddressBook>) {
    const em = this.orm.em.fork();

    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.addressBookNotificationFactory.create(entity, NotificationActionType.UPDATED, actorId),
      (companyId, actorId) => this.getRecipients({companyId: companyId as number, excludeUserId: actorId, em})
    );
  }

  @OnEvent(NotificationType.ADDRESSBOOK_DELETED, { async: true })
  async handleAddressBookDeleted(payload: EntityEventPayload<AddressBook>) {
    const em = this.orm.em.fork();
    
    await this.handleEntityEvent(
        payload,
        (entity, actorId) => this.addressBookNotificationFactory.create(entity, NotificationActionType.DELETED, actorId),
        (companyId, actorId) => this.getRecipients({ companyId: companyId as number, excludeUserId: actorId, em})
    )
  }
}