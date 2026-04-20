import { Module } from "@nestjs/common";
import { ShipmentCarrierController } from "./controller/shipmentCarrier.controller";
import { ShipmentCarrierService } from "./service/shipmentCarrier.service";
import { FedExAdapter } from "./adapter/fedex.adaptar";

@Module({
    imports: [],
    controllers: [ShipmentCarrierController],
    providers: [ShipmentCarrierService]
})

export class ShipmentCarrierModule {}