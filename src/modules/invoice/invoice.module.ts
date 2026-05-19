import { Module } from "@nestjs/common";
import { InvoiceController } from "./controller/invoice.controller";
import { InvoiceService } from "./service/invoice.service";
import { PaymentModule } from "../payment/payment.module";
import { RequestContextService } from "src/utils/request-context-service";

@Module({
    imports: [PaymentModule],
    controllers: [InvoiceController],
    providers: [InvoiceService, RequestContextService]
})

export class InvoiceModule {}