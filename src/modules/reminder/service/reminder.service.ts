import { EntityManager } from "@mikro-orm/core";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateReminderDTO } from "../dto/create-reminder.dto";
import { User } from "src/entities/user.entity";
import { Reminder } from "src/entities/reminder.entity";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ReminderStatus } from "src/common/enum/reminder.enum";

@Injectable()
export class ReminderService {
    constructor(private readonly em: EntityManager, 
        @InjectQueue("reminder") private readonly reminderQueue: Queue
    ) {}

   async create(dto: CreateReminderDTO, currentUserId: number) {
        const { sendTo, title, message, scheduledAt } = dto;

        // Validate users
       const users = await this.em.find(User, { id: { $in: sendTo } });
        if (users.length !== sendTo.length) {
            const missing = sendTo.filter(id => !users.some(u => u.id === id));
            throw new BadRequestException(`Invalid sendTo references: ${missing.join(', ')}`);
        }

        const SCHEDULE_WINDOW_MS = 1 * 60 * 1000; // 1 minutes — reject past dates beyond this buffer
        const MAX_FUTURE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year max — reject obviously wrong future dates

        const scheduledTime = scheduledAt instanceof Date 
            ? scheduledAt.getTime() 
            : new Date(scheduledAt).getTime();

        if (isNaN(scheduledTime)) {
            throw new BadRequestException("Invalid scheduledAt date");
        }

        const now = Date.now();
        const diff = scheduledTime - now;

        if (diff < -SCHEDULE_WINDOW_MS) {
            throw new BadRequestException(
                `scheduledAt is in the past (${Math.round(Math.abs(diff) / 1000 / 60)} minutes ago). ` +
                `Check your device clock or schedule a future time.`
            );
        }

        if (diff > MAX_FUTURE_MS) {
            throw new BadRequestException("scheduledAt is too far in the future");
        }

        // Allow small negative diffs (within 5 min) to execute immediately — handles minor skew
        const delay = Math.max(0, diff);

        const reminders = users.map(user => 
            this.em.create(Reminder, {
                title,
                message,
                scheduledAt: new Date(scheduledTime),
                sendTo: user,
                createdBy: currentUserId,
                status: ReminderStatus.PENDING
            })
        );

        this.em.persist(reminders);
        await this.em.flush()

        // Bulk add to queue
        const jobs = await Promise.all(
            reminders.map(reminder => {
                return this.reminderQueue.add(
                    'send-reminder',
                    { reminderId: reminder.id },
                    { delay: Math.max(0, delay) }
                );
            })
        );

        // Update bullJobIds
        reminders.forEach((reminder, i) => {
            reminder.bullJobId = jobs[i].id;
        });

        await this.em.flush();

        return {
            message: `Created ${reminders.length} reminders`,
        };
    }
}