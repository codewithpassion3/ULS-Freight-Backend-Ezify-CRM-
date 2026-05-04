import { IQuoteFactory } from "src/interfaces/IQuote.inteface";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { NotFoundException } from "@nestjs/common";
import { QuoteConstructorParams } from "src/types/quote";

import { CreateSpotLTLQuote } from "./standard-ltl/create-spot-ltl";

export class SpotQuoteFactory implements IQuoteFactory {
    create(params: QuoteConstructorParams) {
        switch(params.shipmentType){
            case ShipmentType.SPOT_LTL:
                return new CreateSpotLTLQuote({data: params.data, em: params.em, session: params.session});
          
            default:
                throw new NotFoundException(`Spot quote factory doesn't support ${params.shipmentType}`)
        }
    }

    update(params: QuoteConstructorParams) {
        switch(params.shipmentType){
            default:
                throw new NotFoundException(`Spot quote factory doesn't support ${params.shipmentType}`)
        }
    }
}