import { IQuoteFactory } from "src/interfaces/IQuote.inteface";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { SpotFTLQuote } from "./spot-ftl-quote";
import { QuoteConstructorParams } from "src/types/quote";

export class SpotQuoteFactory implements IQuoteFactory {
    create(params: QuoteConstructorParams): any {  
        switch(params.shipmentType){
            case ShipmentType.SPOT_FTL:
                return new SpotFTLQuote();
            default:
                return new Error("Invalid shipment type")
        }
    }
}