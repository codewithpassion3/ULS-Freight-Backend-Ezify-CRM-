// src/modules/worker/reminder.worker.ts
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { ReminderStatus } from 'src/common/enum/reminder.enum';
import { Reminder } from 'src/entities/reminder.entity';
import { NotificationService } from '../notification/service/notification.service';
import { REDIS_CLIENT } from 'src/shared/redis/redis.module';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Severity } from 'src/common/enum/severity.enum';

@Injectable()
export class ReminderWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | null = null;

  constructor(
    private readonly em: EntityManager,
    private readonly notificationService: NotificationService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      'reminder',
      async (job) => {
        if (job.name !== 'send-reminder') return;

        console.log(`[WORKER] 🔔 Processing job ${job.id} for reminder ${job.data.reminderId}`);

        const em = this.em.fork();
        const { reminderId } = job.data;

        // Wrap in transaction for atomicity
        await em.transactional(async (trx) => {
          const reminder = await trx.findOne(
            Reminder,
            { id: reminderId },
            { populate: ['sendTo', 'createdBy'] }
          );

          if (!reminder) {
            console.log(`[WORKER] Reminder ${reminderId} not found`);
            return;
          }
          
          if (reminder.status !== ReminderStatus.PENDING) {
            console.log(`[WORKER] Reminder ${reminderId} already ${reminder.status}`);
            return;
          }

          reminder.status = ReminderStatus.COMPLETED;

          await this.notificationService.broadcast({
            notificationData: {
              type: NotificationType.REMINDER,
              severity: Severity.NORMAL,
              payload: {
                title: reminder.title,
                message: reminder.message,
              },
              actorId: reminder.createdBy.id,
            },
            recipients: [reminder.sendTo.id],
            entityManager: trx, // <-- FIXED: pass the transactional EM, not this.em
          });

          // No need for explicit flush — transactional() commits automatically
        });

        console.log(`[WORKER] ✅ Notification sent for reminder ${reminderId}`);
      },
      {
        connection: this.redisClient,
        concurrency: 5,
      }
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[WORKER] ❌ Job ${job?.id} failed:`, err.message);
    });
  }

  onModuleDestroy() {
    return this.worker?.close();
  }
}