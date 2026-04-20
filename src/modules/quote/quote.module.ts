import { Module } from "@nestjs/common";
import { QuoteController } from "./controller/quote.controller";
import { QuoteService } from "./service/quote.service";
import { NotificationsModule } from "../notification/notification.module";

@Module({
    imports: [NotificationsModule],
    controllers: [QuoteController],
    providers: [QuoteService]
})

export class QuoteModule {}