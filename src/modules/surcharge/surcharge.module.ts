import { Module } from "@nestjs/common";
import { SurchargeController } from "./controller/surcharge.controller";
import { SurchargeService } from "./service/surcharge.service";
import { EmailModule } from "src/email/email.module";

@Module({
    imports: [EmailModule],
    controllers: [SurchargeController],
    providers: [SurchargeService]
})

export class SurchargeModule {}