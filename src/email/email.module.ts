import { Module } from "@nestjs/common";
import { MailConfigModule } from "./mailbox/mail.config.module";
import { EmailListener } from "./listeners/email.listener";
import { EmailService } from "./email.service";

@Module({
    imports: [MailConfigModule],
    controllers: [],
    providers: [EmailService, EmailListener],
    exports: [EmailService]
})

export class EmailModule {}