import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { FedExAdapter } from "../adapter/fedex.adaptar";

@Injectable()
export class ShipmentCarrierService {
    constructor(
        private readonly em: EntityManager,
    ) {}
    
    async getShipmentCarriersRates(dto: any){
        console.log('ENV CHECK:', {
        id: process.env.FEDEX_CLIENT_ID,
        secret: process.env.FEDEX_CLIENT_SECRET ? '***' : undefined,
        account: process.env.FEDEX_ACCOUNT_NUMBER
        });

        console.log('MAPPING PACKAGES:', JSON.stringify(dto.packages, null, 2));
        

        console.log('RAW DTO:', JSON.stringify(dto, null, 2));

        const fedex = new FedExAdapter({
            name: "FedEx",
            clientId: process.env.FEDEX_CLIENT_ID!,
            clientSecret: process.env.FEDEX_CLIENT_SECRET!,
            accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!
        });

        console.log({ incomingPayload: dto });

        const quotes = await fedex.getRates(dto);

        console.log({ quotes })
        
        return {
            message: "Fedex rates fetched successfully",
            fedexQuotes: quotes
        }
                
    }
}