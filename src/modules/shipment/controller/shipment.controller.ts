import { EntityManager } from "@mikro-orm/postgresql";
import { Body, Controller, Post, Session, UseGuards } from "@nestjs/common";
import type { SessionData } from "express-session";
import { PermissionsGuard } from "src/guards/permissions.guard";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { ShipmentService } from "../service/shipment.service";
import { CreateShipmentDTO } from "../dto/create-shipment.dto";

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
}

