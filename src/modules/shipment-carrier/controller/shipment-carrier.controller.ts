import { EntityManager } from "@mikro-orm/postgresql";
import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { ShipmentCarrierService } from "../service/shipment-carrier.service";
import type { Request, Response } from "express";
import { CreateCarrierShipmentDTO } from "src/modules/shipment-carrier/dto/create-carrier-shipment.dto";
import { ShipmentRatesStreamDto } from "../dto/shipment-rates-stream.dto";

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


    @Post('/rates/stream')
    async StreamShipmentCarriersRates(
        @Body() dto: ShipmentRatesStreamDto,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        res.flushHeaders();

        const stream$ = this.shipmentCarrierService.getShipmentCarriersRatesStream(dto);

        const subscription = stream$.subscribe({
            next: (event) => {
                if (!res.writableEnded) {
                    res.write(`data: ${event.data}\n\n`);
                }
            },
            error: (err) => {
                if (!res.writableEnded) {
                    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
                    res.end();
                }
            },
            complete: () => {
                if (!res.writableEnded) {
                    res.write(`event: complete\ndata: ${JSON.stringify({ done: true })}\n\n`);
                    res.end();
                }
            },
        });

        req.on('close', () => {
            subscription.unsubscribe();
            if (!res.writableEnded) {
                res.end();
            }
        });
    }

    @UseGuards(SessionAuthGuard)
    @Post('/shipments')
    async CreateShipment(@Body() dto: CreateCarrierShipmentDTO){
        return this.shipmentCarrierService.createShipment(dto);
    }
}