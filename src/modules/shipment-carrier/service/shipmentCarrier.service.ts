import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { FedExAdapter, RateQuote } from "../adapter/fedex.adaptar";
import { TSTCFExpressAdapter } from "../adapter/tst-cf-express.adaptar";

@Injectable()
export class ShipmentCarrierService {
    constructor(
        private readonly em: EntityManager,
    ) {}
    
   async getShipmentCarriersRates(dto: any) {
    // FedEx
    const fedex = new FedExAdapter({
        name: "FedEx",
        clientId: process.env.FEDEX_CLIENT_ID!,
        clientSecret: process.env.FEDEX_CLIENT_SECRET!,
        accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!
    });
    const fedexQuotes = await fedex.getRates(dto);

    // TST CF Express — same pattern, no credentials in constructor
    // const tstAdapter = new TSTCFExpressAdapter();
    // const tstQuotes = await tstAdapter.getRates(dto);
    // console.log({tstQuotes})
    return {
        message: "Rates fetched successfully",
        fedexQuotes,
        // tstQuotes
    };
}
}