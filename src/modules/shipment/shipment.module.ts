import { Module } from "@nestjs/common";
import { ShipmentController } from "./controller/shipment.controller";
import { ShipmentService } from "./service/shipment.service";
import { RequestContextService } from "src/utils/request-context-service";
import { NotificationsModule } from "../notification/notification.module";

@Module({
    imports: [NotificationsModule],
    controllers: [ShipmentController],
    providers: [ShipmentService, RequestContextService]
})

export class ShipmentModule {}