import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Session, UseGuards } from "@nestjs/common";
import { QuoteService } from "../service/quote.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { PermissionsGuard } from "src/guards/permissions.guard";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { CreateQuoteDTO } from "../dto/create-quote.dto";
import type { PaginationParams } from "src/types/pagination";
import { UpdateQuoteDTO } from "../dto/update-quote.dto";
import { UpdateQuoteStatusDTO } from "../dto/update-quote-status.dto";
import type { SessionData } from "express-session";

@Controller("quotes")
export class QuoteController{
    constructor(private readonly quoteService: QuoteService) {}

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Post("/")
    async Create(@Body() dto: CreateQuoteDTO, @Session() session: SessionData){
        return this.quoteService.create(dto, session);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Get("/")
    async GetAllAgainstCurrentUser(@CurrentUser() currentUserId: number, @Query() params: PaginationParams){
        return this.quoteService.getAllAgainstCurrentUser(currentUserId, params);
    }

     @Get('/favorites')
    async getAllFavoritesAgainstCurrentUser(
        @CurrentUser() currentUserId: number,
        @Query() params: PaginationParams
    ) {
        return this.quoteService.getAllFavoritesAgainstCurrentUser(currentUserId, params);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Get('/favorites/:id')
    async GetFavoriteQuoteByIdAgainstCurrentUser(
        @CurrentUser() currentUserId: number,
        @Param('id') id: number,
    ) {
        return this.quoteService.getFavoriteQuoteByIdAgainstCurrentUser(currentUserId, id);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Patch("/:id")
    async Update(@Param("id") quoteId: number, @Body() dto: UpdateQuoteDTO, @CurrentUser() currentUerId: number){
        return this.quoteService.update(quoteId, dto, currentUerId)
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Get("/:id")
    async GetSingleAgainstCurrentUser(@Param("id") quoteId: number, @CurrentUser() currentUserId: number){
        return this.quoteService.getSingleAgainstCurrentUser(quoteId, currentUserId);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Delete("/:id")
    async DeleteSingleAgainstCurrentUser(@Param("id") quoteId: number, @CurrentUser() currentUserId: number){
        return this.quoteService.deleteSingleAgainstCurrentUser(quoteId, currentUserId);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Post("/:id/favorite")
    async MarkQuoteFavoriteAgainstCurrentUser(@Param("id") quoteId: number, @CurrentUser() currentUserId: number){
        return this.quoteService.markQuoteFavoriteAgainstCurrentUser(quoteId, currentUserId);
    }

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Delete(':id/favorite')
    async UnmarkFavoriteAgainstCurrentUser(@Param('id') quoteId: number, @CurrentUser() currentUserId: number) {
        return this.quoteService.unmarkQuoteFavoriteAgainstCurrentUser(quoteId, currentUserId);
    }

   
    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Patch(':id/status')
    async UpdateStatus(
        @Param('id') quoteId: number, 
        @Body() dto: UpdateQuoteStatusDTO,
        @CurrentUser() currentUserId: number
    ) {
        return this.quoteService.updateStatus(quoteId, dto, currentUserId);
    }

}