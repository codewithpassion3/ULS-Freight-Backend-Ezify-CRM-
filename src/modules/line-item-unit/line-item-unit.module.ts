import { Module } from "@nestjs/common";
import { LineItemUnitController } from "./controller/line-item-unit.controller";
import { LineItemUnitService } from "./service/line-item-unit.service";

@Module({
    controllers: [LineItemUnitController],
    providers: [LineItemUnitService]
})

export class LineItemUnitModule {}