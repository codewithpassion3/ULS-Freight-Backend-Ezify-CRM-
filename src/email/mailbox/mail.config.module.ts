import { MailerModule } from "@nestjs-modules/mailer";
import { Module } from "@nestjs/common";
import path from "path"
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';

@Module({
    imports: [
        MailerModule.forRoot({
            transport: {
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.MAIL_USERNAME,
                    pass: process.env.MAIL_PASSWORD
                }
            },
            defaults: {
                from: "noreply@<uls-freight.com>"
            },
            template: {
                dir: path.join(__dirname, '../templates'),
                adapter: new PugAdapter(),
                options: {
                    strict: true
                }
            }
        })
    ],
    exports: [MailerModule]
})

export class MailConfigModule {}