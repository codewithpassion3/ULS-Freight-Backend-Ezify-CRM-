import { EntityManager } from "@mikro-orm/postgresql";
import { Controller, Get, Query, Session, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { NotificationService } from "../service/notification.service";
import type { SessionData } from "express-session";
import type { GetAllNotificationQueryParams } from "src/types/notification";

@Controller("notifications")
export class NotificationController {
    constructor(private readonly em: EntityManager, private readonly notificationService: NotificationService) {}

    @UseGuards(SessionAuthGuard)
    @Get("/")
    async GetAllAgainstCurrentCompany(@Session() session: SessionData, @Query() queryParams: GetAllNotificationQueryParams){
        return this.notificationService.getAllAgainstCurrentCompany(session, queryParams);
    }

}