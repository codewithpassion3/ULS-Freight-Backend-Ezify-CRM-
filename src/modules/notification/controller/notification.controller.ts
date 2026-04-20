import { EntityManager } from "@mikro-orm/postgresql";
import { Body, Controller, Delete, Get, Post, Query, Session, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { NotificationService } from "../service/notification.service";
import type { SessionData } from "express-session";
import type { GetAllNotificationQueryParams } from "src/types/notification";
import { MarkAsReadDTO } from "../dto/mark-as-read.dto";
import { DismissNotificationQueryDTO } from "../dto/dismiss-notifications.dto";

@Controller("notifications")
export class NotificationController {
    constructor(private readonly em: EntityManager, private readonly notificationService: NotificationService) {}

    @UseGuards(SessionAuthGuard)
    @Get("/")
    async GetAllAgainstCurrentCompany(@Session() session: SessionData, @Query() queryParams: GetAllNotificationQueryParams){
        return this.notificationService.getAllAgainstCurrentUser(session, queryParams);
    }

    @UseGuards(SessionAuthGuard)
    @Post("/read")
    async MarkAsReadAgainstCurrentUser(@Session() session: SessionData, @Body() dto: MarkAsReadDTO){
        return this.notificationService.markAsReadAgainstCurrentUser(session, dto)
    }

    @UseGuards(SessionAuthGuard)
    @Delete("/")
    async dismiss(
        @Session() session: SessionData,
        @Query() dto: DismissNotificationQueryDTO
    ) {
        return this.notificationService.dismissAgainstCurrentUser(session, dto);
    }

}