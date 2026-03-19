import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PalletShippingLocationTypeService } from "../service/pallet-shipping-location-type.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { RolesGuard } from "src/guards/roles.guard";
import { CreatePalletShippingLocationTypeDTO } from "../dto/create-pallet-shipping-location-type.dto";
import { ROLES } from "src/common/constants/roles";
import { Role } from "src/decorators/role.decorator";
import { UpdatePalletShippingLocationTypeDTO } from "../dto/update-pallet-shipping-location-type.dto";

@Controller("pallet-shipping-location-types")
export class PalletShippingLocationTypeController {
    constructor(private readonly palletShippingLocationTypeService: PalletShippingLocationTypeService) {}

    @UseGuards(SessionAuthGuard)
    @Get("/")
    async GetAllPalletShippingLocationTypes(){
        return this.palletShippingLocationTypeService.getAll();
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Post("/")
    async CreatePalletShippingLocationType(@Body() dto: CreatePalletShippingLocationTypeDTO){
        return this.palletShippingLocationTypeService.create(dto);
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Patch("/:id")
    async UpdatePalletShippingLocationType(@Body() dto: UpdatePalletShippingLocationTypeDTO, @Param("id") id: number){
        return this.palletShippingLocationTypeService.update(dto, id);
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Delete("/:id")
    async DeletePalletShippingLocationType(@Param("id") id: number){
        return this.palletShippingLocationTypeService.delete(id);
    }

}