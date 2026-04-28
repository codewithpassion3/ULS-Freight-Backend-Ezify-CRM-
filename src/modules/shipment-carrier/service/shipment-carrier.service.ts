import { EntityManager } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable } from "@nestjs/common";
import { FedExAdapter } from "../adapter/fedex.adaptar";
import { TSTCFExpressAdapter } from "../adapter/tst-cf-express.adaptar";
import { Observable, catchError, from, map, merge, of } from "rxjs";
import { Carrier, CreateCarrierShipmentDTO } from "../dto/create-carrier-shipment.dto";
import { Shipment } from "src/entities/shipment.entity";
import { Quote } from "src/entities/quote.entity";
import { Currency } from "src/common/enum/currency.enum";

@Injectable()
export class ShipmentCarrierService {
    constructor(
        private readonly em: EntityManager,
        private readonly fedexAdapter: FedExAdapter,
        private readonly tstAdapter: TSTCFExpressAdapter
    ) {}
    
   async createShipment(dto: CreateCarrierShipmentDTO) {
       let carrierResponse: any;
       
       if (dto.carrier !== Carrier.FEDEX) {
           throw new BadRequestException("This carrier hasn't been implemented for shipment");
       }

        const quote = await this.em.findOne(
            Quote,
            { id: dto.quoteId },
            {
            populate: [
                "shipment",
                "addresses",
                "lineItems",
                "lineItems.units",
                "addresses.address",
                "addresses.addressBookEntry",
                "addresses.addressBookEntry.address",
                "addresses.addressBookEntry.phoneNumber",
                "addresses.addressBookEntry.contactName"
            ] as any,
            }
        ) as Quote;

        if (!quote) { 
            throw new BadRequestException(`Quote not found: ${dto.quoteId}`);
        }

        if (dto.carrier === 'FEDEX') {
            carrierResponse = await this.fedexAdapter.createShipment(dto, quote);
        }
        
        // if (dto.carrier === 'TST') {
        //     const carrierQuote = await this.tstAdapter.createQuote(dto, dto.selectedRate);
        //     carrierResponse = await this.tstAdapter.createShipment(dto, carrierQuote.quoteId);
        // }

        const shipment = new Shipment();
        
        shipment.tailgateRequiredInFromAddress = dto.tailgatePickup ?? false;
        shipment.tailgateRequiredInToAddress = dto.tailgateDelivery ?? false;
        shipment.carrier = dto.carrier;
        shipment.currency = dto.selectedRate?.currency || Currency.USD;
       
        
        if (dto.carrier === 'FEDEX') {
            const tx = carrierResponse?.output?.transactionShipments?.[0];
            const shipmentRating = tx?.completedShipmentDetail?.shipmentRating?.shipmentRateDetails[0];
            shipment.trackingNumber = tx?.masterTrackingNumber;
            shipment.shipDate = tx?.shipDatestamp;
            shipment.serviceName = tx?.serviceName;
            shipment.serviceType = tx?.serviceType;
            shipment.shippingLabels = tx?.shipmentDocuments[0]?.url;
            shipment.totalBaseCharge = shipmentRating.totalBaseCharge;
            shipment.totalSurcharges = shipmentRating.totalSurcharges;
            shipment.totalFreightDiscounts = shipmentRating.totalFreightDiscounts;
            shipment.totalNetCharge = shipmentRating.totalNetChargeWithDutiesAndTaxes;
            shipment.totalTax = shipmentRating.totalTaxes;
        }

        quote.shipment = shipment;
        shipment.quote = quote;
        this.em.persist([quote, shipment]);

        // if (dto.billingReferences?.length) {
        //     shipment.billingReferences.add(
        //         dto.billingReferences.map((ref) => shipment.billingReferences.add(ref as any) as any)
        //     );
        // }

        await this.em.flush();
    
        return {
            message: 'Shipment created successfully',
            shipment,
            trackingNumber: shipment.trackingNumber
        };
    }

   async getShipmentCarriersRates(dto: any) {
        const [fedexQuotes, tstQuotes] = await Promise.all([
            this.getFedExRates(dto).catch(() => null),
            this.getTSTRates(dto).catch(() => [])
        ]);

        return {
            message: "Rates fetched successfully",
            fedexQuotes: fedexQuotes ?? {},
            tstQuotes
        };
    }

    // NEW: SSE stream — emits each carrier as it completes
    getShipmentCarriersRatesStream(dto: any): Observable<MessageEvent> {
        const carriers = [
            { name: 'fedex', fetch: () => this.getFedExRates(dto) },
            { name: 'tst', fetch: () => this.getTSTRates(dto) },
        ];

        const streams = carriers.map(c => 
            from(c.fetch()).pipe(
                map(quotes => ({
                    data: JSON.stringify({ carrier: c.name, quotes, error: null })
                } as MessageEvent)),
                catchError(err => of({
                    data: JSON.stringify({ carrier: c.name, quotes: null, error: err.message })
                } as MessageEvent))
            )
        );

        return merge(...streams);
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