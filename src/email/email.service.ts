import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class EmailService {
    constructor(private readonly eventEmitter: EventEmitter2 ){}

    async sendOtpEmail(payload: Record<string,any>){
        return this.eventEmitter.emit("otp.send", payload)
    }
}