import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { ReminderController } from "./controller/reminder.controller";
import { ReminderService } from "./service/reminder.service";
import { REDIS_CLIENT } from "src/shared/redis/redis.module";

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (redisClient: Redis) => ({
        connection: redisClient,
      }),
      inject: [REDIS_CLIENT],
    }),
    BullModule.registerQueue({
      name: "reminder",
    }),
  ],
  controllers: [ReminderController],
  providers: [ReminderService],
})
export class ReminderModule {}