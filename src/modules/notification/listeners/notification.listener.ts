import { EntityManager } from "@mikro-orm/core";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Quote } from "src/entities/quote.entity";
import { QuoteNotificationFactory } from "src/factory/notification/quote.factory";
import { NotificationActionType, type EntityEventPayload } from "src/types/notification";
import { NotificationService } from "../service/notification.service";
import { NotificationType } from "src/common/enum/notification-type.enum";
import { Shipment } from "src/entities/shipment.entity";
import { ShipmentNotificationFactory } from "src/factory/notification/shipment.factory";

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notificationService: NotificationService,
    private quoteNotificationFactory: QuoteNotificationFactory,
    private shipmentNotificationFactory: ShipmentNotificationFactory,
    private em: EntityManager
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
      
      await this.notificationService.broadcast(notificationData, recipients);
      
      this.logger.debug(
        `Notification sent for ${notificationData.type} to ${recipients.length} recipients`
      );
    } catch (error) {
      // Log but don't throw - notifications shouldn't break business logic
      this.logger.error('Failed to send notification', error);
    }
  }

  private async getRecipients(companyId: number, excludeUserId?: number): Promise<number[]> {
    // Get company members who should receive quote notifications
    const members = await this.em.find('User', {
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
      (companyId, actorId) => this.getRecipients(companyId as number, actorId)
    );
  }

  @OnEvent(NotificationType.QUOTE_UPDATED, { async: true })
  async handleQuoteUpdated(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.UPDATED, actorId),
      (companyId, actorId) => this.getRecipients(companyId as number, actorId)
    );
  }

  @OnEvent(NotificationType.QUOTE_DELETED, { async: true })
  async handleQuoteDeleted(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
        payload,
        (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.DELETED, actorId),
        (companyId, actorId) => this.getRecipients(companyId as number, actorId)
    )
  }

  //Shipment
  @OnEvent(NotificationType.SHIPMENT_CREATED, { async: true })
  async handleShipmentCreated(payload: EntityEventPayload<Shipment>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.shipmentNotificationFactory.create(entity, NotificationActionType.CREATED, actorId),
      (companyId, actorId) => this.getRecipients(companyId as number, actorId)
    )
  }

  @OnEvent(NotificationType.SHIPMENT_UPDATED, { async: true })
  async handleShipmentUpdated(payload: EntityEventPayload<Shipment>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.shipmentNotificationFactory.create(entity, NotificationActionType.UPDATED, actorId),
      (companyId, actorId) => this.getRecipients(companyId as number, actorId)
    )
  }
}