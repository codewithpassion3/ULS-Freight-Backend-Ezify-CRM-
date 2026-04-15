import { EntityRepository } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Quote } from "src/entities/quote.entity";
import { User } from "src/entities/user.entity";
import { QuoteNotificationFactory } from "src/factory/notification/quote.factory";
import { NotificationActionType, type EntityEventPayload } from "src/types/notification";
import { NotificationService } from "../service/notification.service";
import { NotificationType } from "src/common/enum/notification-type.enum";

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notificationService: NotificationService,
    private quoteNotificationFactory: QuoteNotificationFactory,
  ) {}

  @OnEvent(NotificationType.QUOTE_CREATED, { async: true })
  async handleQuoteCreated(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.CREATED, actorId),
      (entity, actorId) => this.quoteNotificationFactory.getRecipients(entity, actorId)
    );
  }

  @OnEvent(NotificationType.QUOTE_UPDATED, { async: true })
  async handleQuoteUpdated(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
      payload,
      (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.UPDATED, actorId),
      (entity, actorId) => this.quoteNotificationFactory.getRecipients(entity, actorId)
    );
  }

  @OnEvent(NotificationType.QUOTE_DELETED, { async: true })
  async handleQuoteDeleted(payload: EntityEventPayload<Quote>) {
    await this.handleEntityEvent(
        payload,
        (entity, actorId) => this.quoteNotificationFactory.create(entity, NotificationActionType.DELETED, actorId),
        (entity, actorId) => this.quoteNotificationFactory.getRecipients(entity, actorId)
    )
  }


  // Generic handler to reduce duplication
  private async handleEntityEvent<T>(
    payload: EntityEventPayload<T>,
    createNotification: (entity: T, actorId: number) => any,
    getRecipients: (entity: T, actorId: number) => Promise<number[]>
  ) {
    try {
      const { entity, actorId } = payload;
      
      const notificationData = createNotification(entity, actorId);
      const recipients = await getRecipients(entity, actorId);
      
      await this.notificationService.broadcast(notificationData, recipients);
      
      this.logger.debug(
        `Notification sent for ${notificationData.type} to ${recipients.length} recipients`
      );
    } catch (error) {
      // Log but don't throw - notifications shouldn't break business logic
      this.logger.error('Failed to send notification', error);
    }
  }
}