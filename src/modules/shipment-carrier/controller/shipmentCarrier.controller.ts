import { EntityManager } from "@mikro-orm/postgresql";
import { Body, Controller, Get, Post, Session, Sse, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { ShipmentCarrierService } from "../service/shipmentCarrier.service";
import { GetShipmentRatesDTO } from "../dto/get-shipment-rates";
import { Observable } from "rxjs";
import { CreateCarrierShipmentDTO } from "src/modules/shipment-carrier/dto/create-carrier-shipment";

@Controller("shipment-carriers")
export class ShipmentCarrierController {
    constructor(private readonly em: EntityManager,
        private readonly shipmentCarrierService: ShipmentCarrierService
    ) {}

    @UseGuards(SessionAuthGuard)
    @Post("/rates")
    async GetShipmentCarriersRates(@Body() dto: any){
        return this.shipmentCarrierService.getShipmentCarriersRates(dto);
    }

    // NEW: SSE streaming endpoint
    @UseGuards(SessionAuthGuard)
    @Post('/rates/stream')
    @Sse()
    StreamShipmentCarriersRates(@Body() dto: any): Observable<MessageEvent> {
        return this.shipmentCarrierService.getShipmentCarriersRatesStream(dto);
    }

    @UseGuards(SessionAuthGuard)
    @Post('/shipments')
    async CreateShipment(@Body() dto: CreateCarrierShipmentDTO){
        return this.shipmentCarrierService.createShipment(dto);
    }
}