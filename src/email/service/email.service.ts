import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EmailTemplate } from "src/types/email";

@Injectable()
export class EmailService {
    constructor(private readonly eventEmitter: EventEmitter2 ){}

    sendOtpEmail(payload: EmailTemplate){
        this.eventEmitter.emit("otp.generated", payload)
    }

    sendProfileCreatedByAdminEmail(payload: EmailTemplate){
        console.log("send out email")
        this.eventEmitter.emit("profile.created.by.admin", payload)
    }
}