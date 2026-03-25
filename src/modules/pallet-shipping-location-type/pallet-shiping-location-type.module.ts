import { Module } from "@nestjs/common";
import { PalletShippingLocationTypeController } from "./controller/pallet-shipping-location-type.controller";
import { PalletShippingLocationTypeService } from "./service/pallet-shipping-location-type.service";

@Module({
    controllers: [PalletShippingLocationTypeController],
    providers: [PalletShippingLocationTypeService]
})

export class PalletShippingLocationTypeModule {}