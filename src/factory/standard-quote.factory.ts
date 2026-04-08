import { IQuoteFactory } from "src/interfaces/IQuote.inteface";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { NotFoundException } from "@nestjs/common";
import { QuoteConstructorParams } from "src/types/quote";
import { PackageQuote } from "./package-quote";

export class StandardQuoteFactory implements IQuoteFactory {
    create(params: QuoteConstructorParams) {
        //create standard quote for different shipments
        switch(params.shipmentType){
            case ShipmentType.PACKAGE:
                return new PackageQuote({data: params.data, em: params.em, session: params.session});
             case ShipmentType.PALLET:
                // return new PalletQuote(data, em);
            default:
                throw new NotFoundException(`Standard quote factory doesn't support ${params.shipmentType}`)
        }
    }
}