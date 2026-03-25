import { Module } from "@nestjs/common";
import { QuoteController } from "./controller/quote.controller";
import { QuoteService } from "./service/quote.service";

@Module({
    controllers: [QuoteController],
    providers: [QuoteService]
})

export class QuoteModule {}