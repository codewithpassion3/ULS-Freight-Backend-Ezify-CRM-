import { Module } from "@nestjs/common";
import { TrackingController } from "./controller/tracking.controller";
import { TrackingService } from "./service/tracking.service";

@Module({
    controllers: [TrackingController],
    providers: [TrackingService]
})

export class TrackingModule {}