import { EntityManager } from "@mikro-orm/postgresql";
import { Body, Controller, Get, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { ShipmentCarrierService } from "../service/shipmentCarrier.service";
import { GetShipmentRatesDTO } from "../dto/get-shipment-rates";

@Controller("shipment-carriers")
export class ShipmentCarrierController {
    constructor(private readonly em: EntityManager,
        private readonly shipmentCarrierService: ShipmentCarrierService
    ) {}

    @UseGuards(SessionAuthGuard)
    @Get("/rates")
    async GetShipmentCarriersRates(@Body() dto: any){
        return this.shipmentCarrierService.getShipmentCarriersRates(dto);
    }
}