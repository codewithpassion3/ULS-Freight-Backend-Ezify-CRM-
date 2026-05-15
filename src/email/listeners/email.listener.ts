import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { join } from "path";
import puppeteer, { executablePath } from "puppeteer-core";
import type { EmailTemplate } from "src/types/email";
import pug from 'pug';
import { ENV } from "src/common/constants/env";
import { getEnv } from "src/utils/getEnv";

@Injectable()
export class EmailListener {
    constructor(private readonly mailService: MailerService) {}

    @OnEvent("otp.generated")
    async handleEmail(payload: EmailTemplate) {
        const { template, ...otherConfigurations } = payload;
        const mailConfiguration = {
            ...otherConfigurations
        }

        if(template) mailConfiguration["template"] = template;

        await this.mailService.sendMail(mailConfiguration)
    }

    @OnEvent("profile.created.by.admin")
    async handleProfileCreatedByAdmin(payload: EmailTemplate) {
        const { template, ...otherConfigurations } = payload;
        const mailConfiguration = {
            ...otherConfigurations
        }

        if(template) mailConfiguration["template"] = template;

        await this.mailService.sendMail(mailConfiguration)
    }

    @OnEvent("spotQuote.created")
    async handleSpotQuoteEmail(payload: EmailTemplate) {
        const { template, ...otherConfigurations } = payload;
        const mailConfiguration = {
            ...otherConfigurations
        }

        if(template) mailConfiguration["template"] = template;

        await this.mailService.sendMail(mailConfiguration)
    }

    @OnEvent('surcharge-invoice.created')
    async handleInvoiceEmail(payload: any) {
        const { to, subject, context } = payload;

        // 1) Render Pug → HTML
        const templatePath = join(process.cwd(), 'dist', 'email', 'templates', 'surcharge-invoice.pug');
        const html = pug.renderFile(templatePath, context);

        // 2) Generate PDF with puppeteer-core (lightweight)
        const pdfBuffer = await this.generatePdf(html);

        // 3) Simple email body text
        const emailTemplatePath = join(process.cwd(), 'dist', 'email', 'templates', 'invoice-email.pug');
        const emailBody = pug.renderFile(emailTemplatePath, context);

        // 4) Send with PDF attachment
        await this.mailService.sendMail({
            to,
            subject,
            html: emailBody,
            attachments: [
                {
                filename: `Invoice-${context.invoiceNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
                },
            ],
        });
    }

    private async generatePdf(html: string) {
        const executablePath = getEnv(ENV.PUPPETEER_EXECUTABLE_PATH) ||
            (process.platform === 'win32'
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : '/usr/bin/google-chrome');

        const browser = await puppeteer.launch({
            executablePath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });

        const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        });

        await browser.close();
        return Buffer.from(pdfBuffer);
    }
}