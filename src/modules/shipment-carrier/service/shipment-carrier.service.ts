import { EntityManager } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FedExAdapter } from "../adapter/fedex.adapter";
import { TSTCFExpressAdapter } from "../adapter/tst-cf-express.adapter";
import { TForceAdapter } from "../adapter/tforce.adapter";
import { Observable, catchError, from, map, merge, of } from "rxjs";
import { Carrier, CreateCarrierShipmentDTO } from "../dto/create-carrier-shipment.dto";
import { Shipment } from "src/entities/shipment.entity";
import { Quote } from "src/entities/quote.entity";
import { Currency } from "src/common/enum/currency.enum";
import { XPOAdapter } from "../adapter/xpo.adapter";
import { MockCarrierTrackingService } from "src/modules/mock-carrier-tracking/service/mock-carrier-tracking.service";
import { Surcharge } from "src/entities/surcharge";
import { getEnv } from "src/utils/getEnv";
import { ENV } from "src/common/constants/env";

@Injectable()
export class ShipmentCarrierService {
    constructor(
        private readonly em: EntityManager,
        private readonly fedexAdapter: FedExAdapter,
        private readonly tstAdapter: TSTCFExpressAdapter,
        private readonly tforceAdapter: TForceAdapter,
        private readonly xpoAdapter: XPOAdapter,
        private readonly mockTracking: MockCarrierTrackingService
    ) {}
    
   async createShipment(dto: CreateCarrierShipmentDTO) {
       let carrierResponse: any;
       if (![Carrier.FEDEX, Carrier.TST].includes(dto.carrier)) {
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

        if(!quote) {
            throw new NotFoundException("Invalid quote id or you don't have the required permissions")
        }

        if(!quote?.shipment) {
            throw new BadRequestException("Convert quote into shipment to proceed further")
        }

        let shipment = quote.shipment as Shipment;

        if (dto.carrier === Carrier.FEDEX) {
            carrierResponse = await this.fedexAdapter.createShipment(dto, quote);
        
            const tx = carrierResponse?.output?.transactionShipments?.[0];
            const shipmentRating = tx?.completedShipmentDetail?.shipmentRating?.shipmentRateDetails[0];
            shipment.trackingNumber = tx?.masterTrackingNumber;
            shipment.shipDate = tx?.shipDatestamp || Date.now();
            shipment.serviceName = tx?.serviceName;
            shipment.serviceType = tx?.serviceType;
            shipment.shippingLabels = tx?.shipmentDocuments?.[0]?.url;
            shipment.totalBaseCharge = shipmentRating?.totalBaseCharge || 0;
            shipment.totalSurcharges = shipmentRating?.totalSurcharges || 0;
            shipment.totalFreightDiscounts = shipmentRating?.totalFreightDiscounts || 0;
            shipment.totalNetCharge = shipmentRating?.totalNetChargeWithDutiesAndTaxes || 0;
            shipment.totalTax = shipmentRating?.totalTaxes || 0;

            const surchargeEntities = shipmentRating.surcharges.map((surcharge) =>
                this.em.create(Surcharge, {
                    shipment,
                    carrier: Carrier.FEDEX,
                    name: this.fedexAdapter.getSurchargeName(surcharge.surchargeType),
                    amount: surcharge.amount,
                    currency: shipmentRating.currency,
                    createdAt: new Date()
                })
            );

            shipment.surcharges.add(surchargeEntities);
        }
        
        if (dto.carrier === Carrier.TST) {
            carrierResponse = await this.tstAdapter.createShipment(quote, dto.selectedRate);

            const proNumber = carrierResponse?.pro || '';
            const bolPdfBase64 = carrierResponse?.bol?.imagedata || '';

            shipment.trackingNumber = proNumber;
            shipment.carrierQuoteId = proNumber;

            shipment.serviceName = dto.selectedRate?.serviceName || dto.selectedRate?.serviceType || 'STANDARD';
            shipment.serviceType = dto.selectedRate?.serviceType || 'ST';
            shipment.shipDate = quote?.shipment?.shipDate || new Date();
            shipment.currency = dto.selectedRate?.currency || Currency.CAD;

            shipment.shippingLabels = null;

            const quotedTotal = Number(dto.selectedRate?.totalCharge || 0);
            
            shipment.totalBaseCharge = Number(carrierResponse?.charges || quotedTotal);
            shipment.totalSurcharges = Number(carrierResponse?.surcharges || 0);
            shipment.totalFreightDiscounts = Number(carrierResponse?.discounts || 0);
            shipment.totalNetCharge = Number(carrierResponse?.totalnet || carrierResponse?.total || quotedTotal);
            shipment.totalTax = Number(carrierResponse?.taxes || 0);
            shipment.totalCharge = quotedTotal;
        }
    
        shipment.tailgateRequiredInFromAddress = dto.tailgatePickup ?? false;
        shipment.tailgateRequiredInToAddress = dto.tailgateDelivery ?? false;
        shipment.carrier = dto.carrier;
        shipment.currency = dto.selectedRate?.currency || Currency.USD;
       
        this.em.persist([shipment, quote])

        await this.em.flush();

        await this.mockTracking.scheduleTrackingTimeline(
            dto.carrier,
            shipment.trackingNumber as string,
            'standard_delivery',
        );
        

        return {
            message: 'Shipment created successfully',
            shipment,
            trackingNumber: shipment.trackingNumber
        };
    }

    async getShipmentCarriersRates(dto: any) {
        const [tstResult, fedexResult, tforceResult 
            // xpoResult
        ] = await Promise.all([
            this.getTSTRates(dto)
                .then(r => ({ success: true as const, data: r }))
                .catch(e => ({ success: false as const, error: e.message })),
            this.getFedExRates(dto)
                .then(r => ({ success: true as const, data: r }))
                .catch(e => ({ success: false as const, error: e.message })),
            this.getTForceRates(dto)
                .then(r => ({ success: true as const, data: r }))
                .catch(e => ({ success: false as const, error: e.message }))
            // this.getXPORates(dto)
            //     .then(r => ({ success: true as const, data: r }))
            //     .catch(e => ({ success: false as const, error: e.message })),
        ]);
        console.log({fedexResult})
        return {
            message: "Rates fetched",
            fedexQuotes: fedexResult.success ? fedexResult.data : null,
            fedexError: fedexResult.success ? null : fedexResult.error,
            tstQuotes: tstResult.success ? tstResult.data : null,
            tstError: tstResult.success ? null : tstResult.error,
            tforceQuotes: tforceResult.success ? tforceResult.data : null,
            tforceError: tforceResult.success ? null : tforceResult.error,
            // xpoQuotes: xpoResult.success ? xpoResult.data : null,
            // xpoError: xpoResult.success ? null : xpoResult.error,
        };
    }

    // SSE stream — emits each carrier as it completes
    getShipmentCarriersRatesStream(dto: any): Observable<MessageEvent> {
        const carriers = [
            { name: Carrier.FEDEX,   fetch: () => this.getFedExRates(dto) },
            { name: Carrier.TST,     fetch: () => this.getTSTRates(dto) },
            { name: Carrier.TFORCE,  fetch: () => this.getTForceRates(dto) }
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
        const countryCode = fedexDto?.fedex?.from?.countryCode ?? 'US';
        const isUS = countryCode === 'US';

        const accountNumber = getEnv(
            isUS ? ENV.FEDEX_US_ACCOUNT_NUMBER : ENV.FEDEX_CA_ACCOUNT_NUMBER
        )!;

        const fedex = new FedExAdapter({
            name: 'FedEx',
            clientId: getEnv(ENV.FEDEX_CLIENT_ID)!,
            clientSecret: getEnv(ENV.FEDEX_CLIENT_SECRET)!,
            accountNumber,
        });
        let rates = await fedex.getRates(fedexDto);
        let normalizedRates = fedex.mapFedExToCarrierRate(rates);
            normalizedRates = normalizedRates.find( rate => rate.serviceType === "FEDEX_GROUND")

        return normalizedRates;
    }

    private async getTSTRates(tstDto: any) {
        const tstAdapter = new TSTCFExpressAdapter();
        return tstAdapter.getRates(tstDto);
    }

    private async getTForceRates(dto: any) {
        const tforceDto = {
            ...dto,
            type: 'PALLET',
            from: dto.tforce?.from,
            to: dto.tforce?.to,
            pallets: dto.pallets || [],
            dangerousGoods: dto.dangerousGoods || false,
        };

        const rates = await this.tforceAdapter.getRates(tforceDto);
        
        const normalizedRates = this.tforceAdapter.mapTForceToCarrierRate(rates);
        
        if(Array.isArray(normalizedRates)) return normalizedRates[0]
        
        return normalizedRates;
    }

     private async getXPORates(dto: any) {
        const xpoDto = {
            ...dto,
            type: 'PALLET',
            from: dto.xpo?.from,
            to: dto.xpo?.to,
            pallets: dto.packages || [],
            dangerousGoods: false,
        };
 
        const rates = await this.xpoAdapter.getRates(xpoDto);
        const normalizedRates = this.xpoAdapter.mapXPOToCarrierRate(rates);
        return normalizedRates;
    }
}