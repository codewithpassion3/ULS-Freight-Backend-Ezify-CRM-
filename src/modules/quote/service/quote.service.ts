import { EntityManager } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateQuoteDTO } from "../dto/create-quote.dto";
import { Quote } from "src/entities/quote.entity";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { Insurance } from "src/entities/insurance.entity";
import { LineItemUnit } from "src/entities/line-item-unit.entity";
import { LineItem } from "src/entities/line-item.entity";
import { ShippingAddress } from "src/entities/shipping-address.entity";
import { SpotDetails } from "src/entities/spot-details.entity";
import { Signature } from "src/entities/signature.entity";
import { validateQuote } from "src/utils/validateQuote";
import { AddressBook } from "src/entities/address-book.entity";
import { Address } from "src/entities/address.entity";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type.entity";
import { ShippingAddressMeta } from "src/entities/shipping-address-meta.entity";
import { SpotEquipment } from "src/entities/spot-equipment.entity";
import { SpotContact } from "src/entities/spot-contact.entity";
import { EquipmentType } from "src/common/enum/equipment-type.enum";
import { User } from "src/entities/user.entity";
import { PaginationParams } from "src/types/pagination";
import { buildQuery } from "src/utils/api-query";
import { PalletServices } from "src/entities/pallet-services.entity";
import { StandardFtlServices } from "src/entities/standard-ftl-services.entity";
import { SpotLtlServices } from "src/entities/spot-ltl-services.entity";
import { SpotFtlServices } from "src/entities/spot-ftl-services.entity";
import { QuoteType } from "src/common/enum/quote-type.enum";

@Injectable()
export class QuoteService {
    constructor(private readonly em: EntityManager) {}

    async create(dto: CreateQuoteDTO, currentUserId: number) {
        //1) Validate payload
        const { valid, errors } = validateQuote(dto);
        
        //2) Throw exception with errors for invalid payload
        if (!valid) { throw new BadRequestException(errors); }
        
        //3) Create a fork out of entity manager
        const em = this.em.fork();

        //4) Validate signature
        let signature: Signature | null = null;

        if(ShipmentType.COURIER_PACK === dto.shipmentType || ShipmentType.PACKAGE === dto.shipmentType){
            signature = await em.findOne(Signature, { id: dto.signature });

            if (!signature) {
                throw new BadRequestException("Invalid signature id");
            }
        }

        //5) Construct quote entity and start populating it
        const quote = new Quote();
        quote.quoteType = dto.quoteType;
        quote.shipmentType = dto.shipmentType;
        quote.createdBy = em.getReference(User, currentUserId);

        em.persist(quote);

        if(ShipmentType.COURIER_PACK  === dto.shipmentType || ShipmentType.PACKAGE === dto.shipmentType) quote.signature = signature;

        //6) Construct shipping address and shipping address meta entities and start populating 
        if(dto.addresses?.length) {
            for (const addrDto of dto.addresses) {
                const shippingAddress = new ShippingAddress();
                const shippingAddressMeta = new ShippingAddressMeta();

                shippingAddress.type = addrDto.type;
                shippingAddress.quote = quote;

                //7) Check for address book entry
                if (addrDto.addressBookId) {
                        //5) Validate address book 
                    const addressBookEntry = await em.findOne(AddressBook,{ id: addrDto.addressBookId }, { fields: ["id"]})
                    
                    if(!addressBookEntry){
                        throw new NotFoundException("Address book not found, invalid address book id")
                    }

                    shippingAddress.addressBookEntry = addressBookEntry as AddressBook;
                } else {
                    //8) Construct address entity and start populating
                    const address = new Address();

                    address.address1 = addrDto.address1!;
                    address.city = addrDto.city!;
                    address.state = addrDto.state!;
                    address.country = addrDto.country!;
                    address.postalCode = addrDto.postalCode!;

                    shippingAddress.address = address;
                    shippingAddress.isResidential = addrDto.isResidential!;
                    em.persist(address);

                    if (dto.quoteType === QuoteType.SPOT && addrDto.locationType ) {
                        const locationEntity = await em.findOne(PalletShippingLocationType, { id: addrDto.locationType });

                        if(!locationEntity){
                            throw new NotFoundException("Location type not found, invalid location type id")
                        }

                        shippingAddress.locationType = locationEntity;
                    }

                    if (dto.quoteType === QuoteType.SPOT && addrDto.additionalNotes ) {
                        shippingAddressMeta.additionalNotes = addrDto.additionalNotes;
                    }

                }

                //9) Handle shipping address meta fields
                if (dto.quoteType !== 'SPOT' && dto.shipmentType === ShipmentType.STANDARD_FTL) {
                    shippingAddressMeta.includeStraps = addrDto.includeStraps ?? null;
                    shippingAddressMeta.appointmentDelivery = addrDto.appointmentDelivery ?? null;
                }

                if (dto.quoteType === 'SPOT') {
                    shippingAddressMeta.additionalNotes = addrDto.additionalNotes ?? null;
                }

                shippingAddress.meta = shippingAddressMeta;

                em.persist([shippingAddress, shippingAddressMeta]);
            }
        }

        //10) Construct line item entity and start populating
        if(dto.lineItem) {
            const lineItem = new LineItem();

            lineItem.quote = quote;
            lineItem.type = dto.lineItem.type;
            
            if([ShipmentType.COURIER_PACK, ShipmentType.PACKAGE, ShipmentType.PALLET].includes(dto.shipmentType)){
                    lineItem.measurementUnit = dto.lineItem.measurementUnit;
            }

            if(dto.shipmentType === ShipmentType.PACKAGE || dto.shipmentType === ShipmentType.PALLET){
                    lineItem.dangerousGoods = dto.lineItem.dangerousGoods ?? null;
            }

            if(dto.shipmentType === ShipmentType.PALLET){
                lineItem.stackable = dto.lineItem.stackable ?? null;
                lineItem.description = dto.lineItem.description ?? null;
            }
            
            em.persist(lineItem);

            for (const unitDto of dto.lineItem.units) {
                //11) Construct line item unit entity and start populating
                const unit = new LineItemUnit();

                unit.lineItem = lineItem;
                
                if([ShipmentType.PACKAGE, ShipmentType.PALLET].includes(dto.shipmentType)){
                    unit.length = unitDto.length ?? null;
                    unit.width = unitDto.width ?? null;
                    unit.height = unitDto.height ?? null;
                }

                if([ShipmentType.PACKAGE, ShipmentType.COURIER_PACK].includes(dto.shipmentType)){
                    unit.weight = unitDto.weight ?? null;
                }


                if([ShipmentType.COURIER_PACK, ShipmentType.PACKAGE].includes(dto.shipmentType)){
                    unit.description = unitDto.description ?? null;
                    unit.quantity = unitDto.quantity ?? null;
                }

                if(dto.shipmentType === ShipmentType.PACKAGE) {
                    unit.specialHandlingRequired = unitDto.specialHandlingRequired ?? null;
                }
                
                if(dto.shipmentType === ShipmentType.PALLET){
                    unit.freightClass = unitDto.freightClass ?? null;
                    unit.nmfc = unitDto.nmfc ?? null;
                    unit.unitsOnPallet = unitDto.unitsOnPallet ?? null;
                }

                em.persist(unit);
            }
        }

        //12) Construct insurance entity and start populating
        if(dto.insurance) {
            const insurance = new Insurance();

            insurance.quote = quote;
            insurance.amount = dto.insurance.amount;
            insurance.currency = dto.insurance.currency;

            em.persist(insurance);
        }

        //13) Construct spot details entity and start populating
        if(dto.quoteType === QuoteType.SPOT && dto.spotDetails) {
            const spotDetail = new SpotDetails();
            const spotEquipment = new SpotEquipment();
            const spotContact = new SpotContact();

            spotDetail.quote = quote;
            spotDetail.spotType = dto.spotDetails.spotType;
            spotContact.contactName = dto.spotDetails.spotContact.contactName;
            spotContact.phoneNumber = dto.spotDetails.spotContact.phoneNumber;
            spotContact.email = dto.spotDetails.spotContact.email;
            spotContact.shipDate = new Date(dto.spotDetails.spotContact.shipDate);

            if(dto.shipmentType === ShipmentType.TIME_CRITICAL){
                spotContact.deliveryDate = new Date(dto.spotDetails.spotContact.deliveryDate);
            }

            spotContact.spotQuoteName = dto.spotDetails.spotContact.spotQuoteName ?? null;

             if (dto.spotDetails.spotEquipment) {
                const eq = dto.spotDetails.spotEquipment;

                Object.assign(spotEquipment, {
                car: eq.car ?? null,
                dryVan: eq.dryVan ?? null,
                flatbed: eq.flatbed ?? null,
                truck: eq.truck ?? null,
                van: eq.van ?? null,
                ventilated: eq.ventilated ?? null,

                refrigerated: eq.refrigerated
                    ? { type: eq.refrigerated.type }
                    : null,

                nextFlightOut: eq.nextFlightOut
                    ? { knownShipper: eq.nextFlightOut.knownShipper ?? false }
                    : null,
                });
            }

            spotContact.spotDetail = spotDetail;
            spotEquipment.spotDetail = spotDetail;
            spotDetail.spotContact = spotContact;
            spotDetail.spotEquipment = spotEquipment;

            em.persist([spotDetail, spotContact, spotEquipment]);
        }

        if (dto.services && ![ShipmentType.COURIER_PACK, ShipmentType.PACKAGE, ShipmentType.TIME_CRITICAL].includes(dto.shipmentType)) {
            const shipmentTypeToServicesSchemaMapping = {
                "PALLET": PalletServices,
                "STANDARD_FTL": StandardFtlServices,
                "SPOT_LTL": SpotLtlServices,
                "SPOT_FTL": SpotFtlServices
            };

            const ServiceEntity = shipmentTypeToServicesSchemaMapping[dto.shipmentType];
            const serviceSchema = new ServiceEntity();

            for (let service of Object.keys(dto.services)) {
                serviceSchema[service] = dto.services[service];
            }

            if(dto.shipmentType === ShipmentType.PALLET) quote.palletServices = serviceSchema;
            if(dto.shipmentType === ShipmentType.SPOT_FTL) quote.spotFtlServices = serviceSchema;
            if(dto.shipmentType === ShipmentType.SPOT_LTL) quote.spotLtlServices = serviceSchema;
            if(dto.shipmentType === ShipmentType.STANDARD_FTL) quote.standardFTLService = serviceSchema;

            em.persist(quote);
        }


        //14) Persist (save) all entities
        await em.flush();

        //15) Return back success response
        return { message: "Quote created successfully" }
    }

    async getSingleAgainstCurrentUser(quoteId: number, currentUserId: number){
        //1) Get the quote against current user
        const quote = await this.em.findOne(Quote, {
            id: quoteId,
            createdBy: this.em.getReference(User, currentUserId)
        },{
            populate: ["addresses", "addresses.addressBookEntry","lineItems", "lineItems.units",
                        "palletServices", "spotFtlServices", "spotLtlServices", "standardFTLService", 
                        "signature", "spotDetails", "spotDetails.spotContact", "spotDetails.spotEquipment"]
        });

        //2) Throw error for invalid quote
        if(!quote){
            throw new BadRequestException("Invalid quote id or you are not allowed to access this resource")
        }

        //3) Return back success response
        return {
            message: "Successfully retrieved quote",
            quote
        }
    }

    async getAllAgainstCurrentUser(currentUser: number, params: PaginationParams) {
        //1) Define fields allowed for search and filter by oder
       const allowedFields = {
            quoteNumber: "quoteNumber",
            shipmentType: "shipmentType",
            status: "status",
            createdAt: "createdAt",
        };

        //2) Pass query params and allowed field to build query pagination params
        const { search, page, limit, orderBy } = buildQuery(params, allowedFields);
        
        //3) Build filter for query
        const filter: any = { createdBy: this.em.getReference(User, currentUser) };

        //4) Handle search
        if (search) {
            filter.quoteNumber = { $ilike: `${search}%` };
        }

        //5) Handle shipment type filter
        if (params.shipmentType) {
            filter.shipmentType = params.shipmentType;
        }

        //6) Handle Date range filter
        if (params.dateFrom || params.dateTo) {
            filter.createdAt = {};
            if (params.dateFrom) filter.createdAt.$gte = new Date(params.dateFrom);
            if (params.dateTo) filter.createdAt.$lte = new Date(params.dateTo);
        }

        //7) Count total quotes and pages
        const total = await this.em.count(Quote, filter);
        const totalPages = Math.ceil(total / limit) || 1;

        //8) Clamp page based on total page and default page limit
        const clampedPage = Math.min(page, totalPages);
        const offset = (page - 1) * limit;

        //9) Fetch data with all requested relations
        const quotes = await this.em.find(
            Quote,
            filter,
            {
                limit,
                offset,
                orderBy: Object.entries(orderBy).map(([field, direction]) => ({ [field]: direction })),
                populate: [
                    "addresses",
                    "addresses.addressBookEntry",
                    "addresses.address",
                    "lineItems",
                    "lineItems.units",
                    "palletServices",
                    "spotFtlServices",
                    "spotLtlServices",
                    "standardFTLService",
                    "signature",
                    "spotDetails"
                ]
            }
        );

        //10) Return success response
        return {
            message: "Quotes retrieved successfully",
            data: quotes,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: clampedPage < totalPages,
                hasPrevPage: clampedPage > 1,
                sort: orderBy
            }
        };
    }

    async deleteSingleAgainstCurrentUser(quoteId: number, currentUserId: number){
        //1) Get the user reference
        const user = this.em.getReference(User, currentUserId);

        //2) Check for valid quote
        const quote = await this.em.findOne(Quote, { id: quoteId, createdBy: user },
            {
                populate: [
                    'lineItems',
                    'lineItems.units',
                    'spotDetails',
                    'insurance',
                    'signature',
                    'standardFTLService',
                    'palletServices',
                    'spotFtlServices',
                    'spotLtlServices',
                    'userMeta',
                    'addresses'
                ]
            }
        );
        
        //3) Throw error for invalid quote
        if(!quote){
            throw new NotFoundException("Quote not found or you are not allowed to access this resource.");
        }

        //4) Delete quote
        this.em.remove(quote)
        await this.em.flush();
        
        //5) Return back success response
        return { message: 'Quote deleted successfully' };
    }
}