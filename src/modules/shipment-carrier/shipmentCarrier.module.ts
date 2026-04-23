import { Module } from "@nestjs/common";
import { ShipmentCarrierController } from "./controller/shipmentCarrier.controller";
import { ShipmentCarrierService } from "./service/shipmentCarrier.service";
import { FedExAdapter } from "./adapter/fedex.adaptar";
import { TSTCFExpressAdapter } from "./adapter/tst-cf-express.adaptar";

@Module({
    imports: [],
    controllers: [ShipmentCarrierController],
     providers: [
        ShipmentCarrierService,
        {
            provide: FedExAdapter,
            useFactory: () => new FedExAdapter({
                name: 'fedex',
                clientId: process.env.FEDEX_CLIENT_ID!,
                clientSecret: process.env.FEDEX_CLIENT_SECRET!,
                accountNumber: "740561073",
            }),
        },
        {
            provide: TSTCFExpressAdapter,
            useFactory: () => new TSTCFExpressAdapter({
                baseUrl: process.env.TST_CF_BASE_URL,
            }),
        },
    ],
})

export class ShipmentCarrierModule {}