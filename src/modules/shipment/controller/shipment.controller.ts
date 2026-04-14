import { Body, Controller, Param, Patch, Post, Session, UseGuards } from "@nestjs/common";
import type { SessionData } from "express-session";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { ShipmentService } from "../service/shipment.service";
import { CreateShipmentDTO } from "../dto/create-shipment.dto";
import { UpdateShipmentDTO } from "../dto/update-shipment.dto";
@Controller("shipments")
export class ShipmentController {
    constructor(private readonly shipmentService: ShipmentService) {}

    @UseGuards(SessionAuthGuard)
    @Post("/")
    async createShipment(
      @Body() dto: CreateShipmentDTO,
      @Session() session: SessionData
    ) {
      return this.shipmentService.create(dto, session);
    }

    @UseGuards(SessionAuthGuard)
    @Patch("/:id")
    async updateShipment(
      @Body() dto: UpdateShipmentDTO,
      @Param("id") shipmentId: number,
      @Session() session: SessionData
    ) {
      return this.shipmentService.update(dto, shipmentId, session);
    }
}

