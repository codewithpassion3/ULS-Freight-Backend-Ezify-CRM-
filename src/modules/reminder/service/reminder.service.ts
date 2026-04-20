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

        // Bulk create reminders via native insert (no entity instances needed yet)
        const testScheduledAt = new Date(Date.now() + 20000);

        if(new Date(scheduledAt).getTime() < Date.now()) {
            throw new BadRequestException("Can not set past time for the notification")
        }
        
        const reminders = users.map(user => 
            this.em.create(Reminder, {
                title,
                message,
                scheduledAt: new Date(scheduledAt),
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
                const delay = reminder.scheduledAt.getTime() - Date.now();
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