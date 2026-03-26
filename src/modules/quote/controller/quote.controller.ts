import { Body, Controller, Get, Param, Post, Query, Session, UseGuards } from "@nestjs/common";
import { QuoteService } from "../service/quote.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { PermissionsGuard } from "src/guards/permissions.guard";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { CreateQuoteDTO } from "../dto/create-quote.dto";
import type { PaginationParams } from "src/types/pagination";

@Controller("quotes")
export class QuoteController{
    constructor(private readonly quoteService: QuoteService) {}

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Post("/")
    async Create(@Body() dto: CreateQuoteDTO, @CurrentUser() currentUserId: number){
        return this.quoteService.create(dto, currentUserId);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Get("/")
    async GetAllAgainstCurrentUser(@CurrentUser() currentUserId: number, @Query() params: PaginationParams){
        return this.quoteService.getAllAgainstCurrentUser(currentUserId, params);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Get("/:id")
    async GetSingleAgainstCurrentUser(@Param("id") quoteId: number, @CurrentUser() currentUserId: number){
        return this.quoteService.getSingleAgainstCurrentUser(quoteId, currentUserId);
    }

}