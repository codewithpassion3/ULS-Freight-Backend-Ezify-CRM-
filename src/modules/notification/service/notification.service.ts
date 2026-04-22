import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery, raw } from '@mikro-orm/core';
import { EntityManager as EntityManagerPostgres } from '@mikro-orm/postgresql';
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
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/shared/redis/redis.module';

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
    private readonly sseService: SSEService,
    @Inject(REDIS_CLIENT) private redisClient: Redis
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
    await this.redisClient.publish(
      'notification.created',
      JSON.stringify({
        notificationId: notification.id,
        recipients: uniqueRecipients,
        payload: notificationData.payload,
        type: notificationData.type,
      }),
    );
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
    userNotifications: UserNotification[],
    entityManager: EntityManager
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

    await entityManager.flush();
  }

  async getAllAgainstCurrentUser(
      session: SessionData,
      queryParams: GetAllNotificationQueryParams
  ): Promise<GetAllNotificationsResult> {
    //1) Define allowed fields
      const allowedFields = {
          createdAt: "un.createdAt",
          read: "un.read",
          readAt: "un.readAt",
      };
    
    //2) Check valid query params
    const { page, limit, orderBy, search } = buildQuery(
        queryParams,
        allowedFields,
        "un.createdAt:desc"
    );

    //3) Build query using query builder
    const offset = (page - 1) * limit;

    const qb = (this.em as EntityManagerPostgres)
        .createQueryBuilder(UserNotification, 'un')
        .innerJoinAndSelect('un.notification', 'n')
        .where({ user: session.userId });

    //4) Apply filters
    if (queryParams.isRead !== undefined) {
        qb.andWhere({ read: queryParams.isRead === true });
    }

    if (queryParams.severity) {
        qb.andWhere({ 'n.severity': queryParams.severity });
    }

    if (queryParams.startDate) {
        qb.andWhere({ createdAt: { $gte: new Date(queryParams.startDate) } });
    }

    if (queryParams.endDate) {
        qb.andWhere({ createdAt: { $lte: new Date(queryParams.endDate) } });
    }

    if (search) {
        const safeSearch = search.replace(/'/g, "''");
        qb.andWhere(
            raw(`(n.payload->>'title' ilike '%${safeSearch}%' OR n.payload->>'message' ilike '%${safeSearch}%')`)
        );
    }

    const finalOrderBy = Object.keys(orderBy).length > 0 ? orderBy : { 'un.createdAt': 'DESC' };
    
    qb.orderBy(finalOrderBy).limit(limit).offset(offset);

    //5) Get back result
    const [userNotifications, total] = await qb.getResultAndCount();

    //6) Map fields 
    const mappedData = userNotifications.map(un => ({
        ...(un.notification as any),
        isRead: un.read ?? false,
        readAt: un.readAt ?? null,
        userNotificationId: un.id,
    }));

    //7) Return success response
    return {
        message: "Notifications retrieved successfully",
        notifications: mappedData as any,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
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