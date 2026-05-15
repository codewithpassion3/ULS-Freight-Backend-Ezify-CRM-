import { Module } from "@nestjs/common";
import { InvoiceController } from "./controller/invoice.controller";
import { InvoiceService } from "./service/invoice.service";
import { PaymentModule } from "../payment/payment.module";

@Module({
    imports: [PaymentModule],
    controllers: [InvoiceController],
    providers: [InvoiceService]
})

export class InvoiceModule {}