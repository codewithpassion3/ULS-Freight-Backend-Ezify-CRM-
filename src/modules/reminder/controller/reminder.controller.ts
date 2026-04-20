import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CreateReminderDTO } from "../dto/create-reminder.dto";
import { ReminderService } from "../service/reminder.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { CurrentUser } from "src/decorators/currentUser.decorator";

@Controller("reminders")
export class ReminderController {
    constructor(private readonly reminderService: ReminderService) {}

    @UseGuards(SessionAuthGuard)
    @Post("/")
    async Create(@Body() dto: CreateReminderDTO, @CurrentUser() currentUserId: number){
        return this.reminderService.create(dto, currentUserId);
    }
}