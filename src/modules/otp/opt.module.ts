import { Module } from "@nestjs/common";
import { OtpController } from "./controller/otp.controller";
import { OtpService } from "./service/otp.service";
import { EmailModule } from "src/email/email.module";

@Module({
    imports: [EmailModule],
    controllers: [OtpController],
    providers: [OtpService],
    exports: [OtpService]
})

export class OtpModule {}