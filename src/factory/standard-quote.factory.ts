import { IQuoteFactory } from "src/interfaces/IQuote.inteface";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { NotFoundException } from "@nestjs/common";
import { QuoteConstructorParams } from "src/types/quote";
import { CreatePackageQuote } from "./package/create-package-quote";
import { PalletQuote } from "./pallet/create-pallet-quote";
import { CourierPakQuote } from "./courier-pak/create-courier-pak-quote";
import { StandardFTLQuote } from "./standard-ftl-quote";
import { UpdatePackageQuote } from "./package/update-package-quote";
import { UpdatePalletQuote } from "./pallet/update-pallet-quote";
import { UpdateCourierPakQuote } from "./courier-pak/update-courier-pak-quote";

export class StandardQuoteFactory implements IQuoteFactory {
    create(params: QuoteConstructorParams) {
        switch(params.shipmentType){
            case ShipmentType.PACKAGE:
                return new CreatePackageQuote({data: params.data, em: params.em, session: params.session});
            case ShipmentType.PALLET:
                return new PalletQuote({data: params.data, em: params.em, session: params.session});
            case ShipmentType.COURIER_PAK:
                return new CourierPakQuote({data: params.data, em: params.em, session: params.session});
            case ShipmentType.STANDARD_FTL:
                return new StandardFTLQuote({data: params.data, em: params.em, session: params.session});
            default:
                throw new NotFoundException(`Standard quote factory doesn't support ${params.shipmentType}`)
        }
    }

    update(params: QuoteConstructorParams) {
        switch(params.shipmentType){
            case ShipmentType.PACKAGE:
                return new UpdatePackageQuote({data: params.data, em: params.em, session: params.session});
            case ShipmentType.PALLET:
                return new UpdatePalletQuote({data: params.data, em: params.em, session: params.session});
            case ShipmentType.COURIER_PAK:
                return new UpdateCourierPakQuote({data: params.data, em: params.em, session: params.session});
            default:
                throw new NotFoundException(`Standard quote factory doesn't support ${params.shipmentType}`)
        }
    }
}