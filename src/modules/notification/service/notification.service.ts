import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { Inject, forwardRef } from '@nestjs/common';
import { UserNotification } from 'src/entities/user-notification.entity';
import { Notification } from 'src/entities/notification.entity';
import { SSEService } from 'src/modules/sse/service/sse.service';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Severity } from 'src/common/enum/severity.enum';
import { EntityType } from 'src/common/enum/entity-type.enum';
import { GetAllNotificationQueryParams, GetAllNotificationsResult, NotificationBroadcastParams } from 'src/types/notification';
import { buildQuery } from 'src/utils/api-query';
import { SessionData } from 'express-session';
import { MarkAsReadDTO } from '../dto/mark-as-read.dto';
import { DismissNotificationQueryDTO } from '../dto/dismiss-notifications.dto';

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
  actorId?: number; // Optional for system notifications
  channels?: ('in_app' | 'email' | 'push')[];
  expiresAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly em: EntityManager,
    @Inject(forwardRef(() => SSEService))
    private readonly sseService: SSEService
  ) {}

  /**
   * Main broadcast method - creates notification records and triggers delivery
   */
  async broadcast(
    {
      notificationData,
      recipients,
      entityManager
    }: NotificationBroadcastParams
  ): Promise<Notification | null> {
    const uniqueRecipients = [...new Set(recipients)].filter(Boolean);
    
    if (uniqueRecipients.length === 0) {
      this.logger.warn('Broadcast called with no recipients');
      return null;
    }

    // Create Notification entity
    const notification = entityManager.create(Notification, {
      type: notificationData.type,
      severity: notificationData.severity,
      payload: notificationData.payload,
      actorId: notificationData.actorId,
      userNotifications: []
    });

    // Create junction records
    const userNotifications = uniqueRecipients.map((userId) => 
      entityManager.create(UserNotification, {
        notification,
        user: userId,
        read: false,
        deliveryStatus: { sse: { sentAt: new Date() } }
      })
    );

    entityManager.persist([notification, ...userNotifications]);
    await entityManager.flush();
    
    this.logger.debug(
      `Created notification ${notification.id} for ${uniqueRecipients.length} recipients`
    );

    // Fire-and-forget delivery
    this.deliverToRecipients(userNotifications).catch(err => {
      this.logger.error('Failed to deliver notifications:', err);
    });

    return notification;
  }

  /**
   * Send to single user
   */
  async sendToUser(
    notificationData: NotificationData, 
    userId: number
  ): Promise<Notification | null> {
    return this.broadcast({notificationData, recipients: [userId], entityManager: this.em});
  }

  /**
   * Send to company (all active members except excluded)
   */
  async sendToCompany(
    notificationData: NotificationData,
    companyId: number,
    excludeUserIds: number[] = []
  ): Promise<Notification | null> {
    const members = await this.em.find('User', { 
      companyId,
      id: { $nin: excludeUserIds },
      isActive: true 
    }, { fields: ['id'] });

    const recipientIds = members.map(m => m.id);
    
    if (recipientIds.length === 0) {
      this.logger.warn(`No active members found for company ${companyId}`);
      return null;
    }
    
    return this.broadcast({ notificationData, recipients: recipientIds, entityManager: this.em });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    userNotificationId: number, 
    userId: number
  ): Promise<void> {
    const un = await this.em.findOne(UserNotification, {
      id: userNotificationId,
      user: userId
    });

    if (!un) {
      throw new NotFoundException('Notification not found');
    }

    if (un.read) return;

    un.read = true;
    un.readAt = new Date();
    await this.em.flush();
  }

  /**
   * Get unread count for badge
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.em.count(UserNotification, {
      user: userId,
      read: false
    });
  }

  /**
   * Get inbox with ID-based pagination (faster than date cursors)
   */
  async getInbox(
    userId: number, 
    options: { limit?: number; beforeId?: number } = {}
  ): Promise<UserNotification[]> {
    const { limit = 20, beforeId } = options;

    const where: any = { userId };
    
    if (beforeId) {
      where.id = { $lt: beforeId }; // ID-based pagination
    }

    return this.em.find(UserNotification, where, {
      populate: ['notification'],
      orderBy: { id: 'desc' },
      limit
    });
  }

  /**
   * Cleanup old read notifications (run as cron job)
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Find notifications where all recipients have read AND it's old
    const oldNotifications = await this.em.find(Notification, {
      createdAt: { $lt: cutoffDate },
      userNotifications: { 
        $every: { read: true } // All recipients read it
      }
    });

    if (oldNotifications.length > 0) {
      await this.em.removeAndFlush(oldNotifications);
      this.logger.log(`Cleaned up ${oldNotifications.length} old notifications`);
    }
    
    return oldNotifications.length;
  }

  /**
   * Internal: Deliver via SSE
   */
  private async deliverToRecipients(
    userNotifications: UserNotification[]
  ): Promise<void> {
    const batchSize = 100;
    
    for (let i = 0; i < userNotifications.length; i += batchSize) {
      const batch = userNotifications.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (notification) => {
          try {
            const userId = String(notification.user?.id);
            const delivered = await this.sseService.sendToUser(userId, {
              id: notification.id.toString(), // SSE spec requires string IDs
              event: 'notification.new',
              data: {
                userNotificationId: notification.id,
                notificationId: notification.notification.id,
                type: notification.notification.type,
                severity: notification.notification.severity,
                payload: notification.notification.payload,
                createdAt: notification.createdAt,
                actorId: notification.notification.actorId
              }
            });

              if (delivered) {
                notification.deliveryStatus = {
                  sse: {
                    sentAt: notification.deliveryStatus?.sse?.sentAt ?? new Date(), // Preserve existing or fallback
                    deliveredAt: new Date()
                  }
                };
              }
          } catch (error) {
            this.logger.error(`Delivery failed for UN ${notification.id}:`, error);
          }
        })
      );
    }

    await this.em.flush();
  }

  async getAllAgainstCurrentCompany(session: SessionData, queryParams: GetAllNotificationQueryParams):  Promise<GetAllNotificationsResult> {
    //1) Define allowed fields
    const allowedFields = {
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        type: "type",
        severity: "severity"
    };

    //2) Build query params
    const { page, limit, orderBy, search } = buildQuery(
        queryParams, 
        allowedFields, 
        "createdAt:desc"
    );
    const offset = (page - 1) * limit;

    //3) Build where clause with company scoping
    const where: FilterQuery<Notification> = {
        //4) Scope to current company through userNotifications -> user
        userNotifications: {
            user: {
                company: session.companyId
            }
        }
    };

    //5) Filter: Notification type
    if (queryParams.type) {
        where.type = queryParams.type;
    }

    //6) Filter: Severity level
    if (queryParams.severity) {
        where.severity = queryParams.severity;
    }

    //7) Filter: Entity type (inside JSONB payload)
    if (queryParams.entityType) {
        where.payload = { 
            ...(where.payload || {}),
            entityType: queryParams.entityType 
        };
    }

    //8) Filter: Current user's read status (requires matching specific user)
   if (queryParams.isRead !== undefined) {
        const isReadBool = queryParams.isRead === true;
        where.userNotifications = {
            user: session.userId,
            read: isReadBool
        };
    }

    //9) Search: apply on title and message inside payload
    if (search) {
        where.$or = [
            { payload: { title: { $ilike: `%${search}%` } } },
            { payload: { message: { $ilike: `%${search}%` } } }
        ] as any;
    }

    //10) Fetch paginated data
    const [notifications, total] = await this.em.findAndCount(
        Notification,
        where,
        {
            populate: ["userNotifications"],
            fields: [
                "id",
                "type",
                "severity",
                "payload",
                "actorId",
                "createdAt",
                "updatedAt"
            ],
            orderBy: Object.keys(orderBy).length > 0 ? orderBy : { createdAt: "DESC" },
            limit,
            offset
        }
    );

    //11) Optional: Map to include current user's read status without exposing other users' data
    const mappedData = notifications.map(notification => {
        const userNotification = notification.userNotifications.getItems().find((userNotification: any) => userNotification.user.id === session.userId);
            
        return {
            ...notification,
            isRead: userNotification?.read ?? false,
            readAt: userNotification?.readAt ?? null,
            userNotifications: undefined 
        };
    });

    //12) Return response
    return {
        message: "Notifications retrieved successfully",
        notifications: mappedData as any,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
  }

  async markAsReadAgainstCurrentUser(session: SessionData, dto: MarkAsReadDTO){
    //1) Construct where clause
     const where: FilterQuery<UserNotification> = {
        user: session.userId,
        read: false,
        notification: { $in: dto.notificationIds }
    };

    //2) Find and update all
    const updatedCount = await this.em.nativeUpdate(
        UserNotification, 
        where, 
        { read: true, readAt: new Date() }
    );
  
    //4) Persist changes
    await this.em.flush();

    //5) Return success response
    return {
        message: `Successfully marked ${updatedCount} notification(s) as read`
    };
  }

  async dismissAgainstCurrentUser(
      session: SessionData, 
      dto: DismissNotificationQueryDTO
  ) {
    //1) Validate incoming query params
    if (!dto.notificationIds?.length && !dto.dismissAll) {
        throw new BadRequestException("Provide notificationIds=1,2,3 or dismissAll=true");
    }

    //2) Construct where clause
    const where: FilterQuery<UserNotification> = {
        user: session.userId,
        ...(dto.notificationIds?.length && { notification: { $in: dto.notificationIds } })
    };

    //3) Bulk delete
    const deletedCount = await this.em.nativeDelete(UserNotification, where);
    
    //4) Return back success response
    return {
        message: `Successfully dismissed ${deletedCount} notification(s)`
    };
  }
}