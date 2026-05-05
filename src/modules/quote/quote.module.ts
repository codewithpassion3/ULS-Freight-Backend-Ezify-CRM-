import { Module } from "@nestjs/common";
import { QuoteController } from "./controller/quote.controller";
import { QuoteService } from "./service/quote.service";
import { NotificationsModule } from "../notification/notification.module";
import { EmailModule } from "src/email/email.module";
import { RequestContextService } from "src/utils/request-context-service";

@Module({
    imports: [NotificationsModule, EmailModule ],
    controllers: [QuoteController],
    providers: [QuoteService, RequestContextService]
})

export class QuoteModule {}