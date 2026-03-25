import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { QuoteService } from "../service/quote.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { PermissionsGuard } from "src/guards/permissions.guard";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { CreateQuoteDTO } from "../dto/create-quote.dto";

@Controller("quotes")
export class QuoteController{
    constructor(private readonly quoteService: QuoteService) {}

    @UseGuards(SessionAuthGuard, PermissionsGuard)
    @Post("/")
    async Create(@Body() dto: CreateQuoteDTO, @CurrentUser() currentUserId: number){
        return this.quoteService.create(dto, currentUserId);
    }
}