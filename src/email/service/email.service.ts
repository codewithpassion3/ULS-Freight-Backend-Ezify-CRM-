import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EmailTemplate, SpotQuoteEmailTemplate } from "src/types/email";

@Injectable()
export class EmailService {
    constructor(private readonly eventEmitter: EventEmitter2 ){}

    sendOtpEmail(payload: EmailTemplate){
        this.eventEmitter.emit("otp.generated", payload)
    }

    sendProfileCreatedByAdminEmail(payload: EmailTemplate){
        this.eventEmitter.emit("profile.created.by.admin", payload)
    }

    sendSpotQuoteEmail(payload: EmailTemplate){
        this.eventEmitter.emit("spotQuote.created", payload)
    }
}