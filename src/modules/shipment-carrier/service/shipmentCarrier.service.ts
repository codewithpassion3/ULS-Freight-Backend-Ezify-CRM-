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
        const [fedexQuotes, tstQuotes] = await Promise.all([
            this.getFedExRates(dto),
            this.getTSTRates(dto)
        ]);

        return {
            message: "Rates fetched successfully",
            fedexQuotes: fedexQuotes[0],
            tstQuotes
        };
    }

    private async getFedExRates(fedexDto: any) {
        const fedex = new FedExAdapter({
            name: "FedEx",
            clientId: process.env.FEDEX_CLIENT_ID!,
            clientSecret: process.env.FEDEX_CLIENT_SECRET!,
            accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!
        });

        return fedex.getRates(fedexDto);
    }

    private async getTSTRates(tstDto: any) {
        const tstAdapter = new TSTCFExpressAdapter();
        return tstAdapter.getRates(tstDto);
    }
}