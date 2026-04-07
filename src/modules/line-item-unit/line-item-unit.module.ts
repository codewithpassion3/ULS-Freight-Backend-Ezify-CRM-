import { Module } from "@nestjs/common";
import { LineItemUnitController } from "./controller/line-item-unit.controller";
import { LineItemUnitService } from "./service/line-item-unit.service";
import { RequestContextService } from "src/utils/request-context-service";

@Module({
    controllers: [LineItemUnitController],
    providers: [LineItemUnitService, RequestContextService]
})

export class LineItemUnitModule {}