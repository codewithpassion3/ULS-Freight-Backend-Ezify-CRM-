import { EntityManager } from "@mikro-orm/core";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateReminderDTO } from "../dto/create-reminder.dto";
import { User } from "src/entities/user.entity";
import { NotFoundError } from "rxjs";
import { Reminder } from "src/entities/reminder.entity";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ReminderStatus } from "src/common/enum/reminder.enum";

@Injectable()
export class ReminderService {
    constructor(private readonly em: EntityManager, 
        @InjectQueue("reminder") private readonly reminderQueue: Queue
    ) {}

    async create(dto: CreateReminderDTO, currentUserId: number){
        //1) Extract fields
        const { sendTo } = dto;

        //2) Validate user
        const userCount = await this.em.count(User, { id: sendTo });

        //3) Throw error for invalid sendTo id
        if(!userCount){
            return new NotFoundException("Invalid sendTo reference")
        }

        //4) Create reminder
        const testScheduledAt = new Date(Date.now() + 20000);

        const reminder = this.em.create(Reminder, {...dto, scheduledAt: testScheduledAt, createdBy: currentUserId, status: ReminderStatus.PENDING });

        this.em.persist(reminder);
        
        await this.em.flush();

        //5) Add reminder to background queue with some delay
        const delay = reminder.scheduledAt.getTime() - Date.now();
        const job = await this.reminderQueue.add(
        'send-reminder',
        { reminderId: reminder.id },
        { delay: Math.max(0, delay) }
        );

        console.log('Bull job created:', {
            jobId: job.id,
            delay: Math.max(0, delay),
            scheduledAt: reminder.scheduledAt,
            queueName: this.reminderQueue.name,
        });
        
        // 6) Store BullMQ job ID for cancellation
        reminder.bullJobId = job.id;

        //7) Flush changes
        await this.em.flush();

        return {
            message: "Reminder created successfully"
        }
    }
}