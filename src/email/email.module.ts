import { Module } from "@nestjs/common";
import { MailConfigModule } from "./mailbox/mail.config.module";
import { EmailListener } from "./listeners/email.listener";
import { EmailService } from "./service/email.service";
import { MailWarmUpService } from "./service/mail-warmup.service";

@Module({
    imports: [MailConfigModule],
    controllers: [],
    providers: [EmailService, EmailListener, MailWarmUpService],
    exports: [EmailService]
})

export class EmailModule {}