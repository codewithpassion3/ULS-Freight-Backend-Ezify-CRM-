import { Quote } from "src/entities/quote.entity";
import { StandardQuote } from "../standard-quote";
import { BadRequestException } from "@nestjs/common";
import { wrap } from "@mikro-orm/core";
import { Mode } from "src/common/enum/mode.enum";
import { AddressBook } from "src/entities/address-book.entity";
import { Address } from "src/entities/address.entity";
import { Company } from "src/entities/company.entity";
import { LineItemUnit } from "src/entities/line-item-unit.entity";
import { LineItem } from "src/entities/line-item.entity";
import { ShippingAddress } from "src/entities/shipping-address.entity";
import { User } from "src/entities/user.entity";
import { QuoteConstructorParams, AddressData } from "../base-quote";
import { PalletServices } from "src/entities/pallet-services.entity";
import { palletRules } from "src/common/constants/quote";
import { validateUnit } from "src/utils/validateQuote";
import { DangerousGoodsClass } from "src/common/enum/line-item.enum";
import { EquipmentType } from "src/common/enum/equipment-type.enum";
import { SpotDetails } from "src/entities/spot-details.entity";
import { SpotContact } from "src/entities/spot-contact.entity";
import { SpotEquipment } from "src/entities/spot-equipment.entity";
import { SpotQuote } from "../spot-quote";
import { RefrigeratedType } from "src/common/enum/refrigerated.enum";

export class CreateSpotLTLQuote extends SpotQuote {
    constructor(params: QuoteConstructorParams) {
        super();
        this.data = params.data;
        this.em = params.em;
        this.session = params.session;
        console.log({payload: params.data})
    }

    async validate(): Promise<void> {
        this.errors = [];
        await this.validateAddresses();
        // this.validateSpotDetails();
        this.validateLineItem();
        this.validateLineItemUnits();
        this.errors.push(...this.validateSpotDetails(this.data.spotDetails, this.errors));
        this.validateServices();
        this.validateInsurance();
        
        if (this.errors.length > 0) {
            throw new BadRequestException({
                message: this.errors
            });
        }

        // Store validated data for build phase
        this.validatedData = this.data;
        console.log({validatedData: this.validatedData})
    }

    async build(): Promise<Quote> {
        console.log({validatedData: this.validatedData})
        if (!this.validatedData) {
            this.errors.push('Must call validate() before build()');
        }
        console.log({validatedData: this.validatedData})
        const quote = new Quote();
        this.validatedData.quote = quote;
        this.data.quote = quote;

        
        quote.quoteType = this.validatedData.quoteType;
        quote.shipmentType = this.validatedData.shipmentType;
        quote.status = this.validatedData.status;

        if (this.validatedData.name) quote.name = this.validatedData.name;

        this.em.persist(quote);

        // Build relationships
        const addresses = await this.buildAddresses();
        console.log({builtAddresses: addresses})
        addresses.forEach(addr => addr.quote = quote);
        quote.addresses.set(addresses);

        quote.lineItems = this.buildLineItem() as any;
        quote.insurance = this.buildInsurance() as any;    
        quote.company = this.em.getReference(Company, this.session.companyId as number);
        quote.createdBy = this.em.getReference(User, this.session.userId as number);

        await this.buildServices();
        
        quote.spotDetails = this.buildSpotDetails();

        return quote;
    }

    

    protected async validateAddressDetails(addresses: AddressData[]): Promise<void> {
      this.validateQuoteAddresses(addresses);  
    }

    protected validateLineItemSpecific(): void {
        const dangerousGoods = this.data.lineItem.dangerousGoods;

        if (!dangerousGoods) return;

        if (typeof dangerousGoods !== "object") {
            this.errors.push("dangerousGoods must be an object");
            return;
        }

        const { un, class: dgClass } = dangerousGoods;

        if (typeof un !== "string" || !un.trim()) {
            this.errors.push("dangerousGoods.un is required and must be a non-empty string");
        }

        if (!Object.values(DangerousGoodsClass).includes(dgClass as DangerousGoodsClass)) {
            this.errors.push(
                `dangerousGoods.class must be one of: ${Object.values(DangerousGoodsClass).join(", ")}`
            );
        }
    }

    protected processLineItemUnit(units: any): void {
        units.forEach((unit: any, idx: number) => {
            const result = validateUnit(unit, palletRules, { unitIndex: idx });
            if (result.errors) {
                this.errors.push(...result.errors);
            }
        });
    }

    protected async buildAddressDetails(
        addrData: AddressData, 
        shippingAddress: ShippingAddress, 
        bookMap: Map<number, AddressBook>
    ): Promise<void> {
        
        if (addrData.addressBookId) {
            // CASE 1: Existing AddressBook
            const book = bookMap.get(addrData.addressBookId);
            
            if (!book) {
                this.errors.push(`AddressBook ${addrData.addressBookId} not found`);
                return; // STOP here, don't continue with invalid reference
            }
            
            shippingAddress.addressBookEntry = this.em.getReference(AddressBook, addrData.addressBookId);
        } 
        else if (this.data.mode === Mode.SHIPMENT) {
            // CASE 2: Create temporary AddressBook
            const addressBook = this.createAddressBook({...addrData, companyId: this.session.companyId, userId: this.session.userId });
            this.em.persist(addressBook);
            shippingAddress.addressBookEntry = addressBook;
        }
        else {
            // CASE 3: Quote mode - Pure manual address
            const addr = new Address();
            wrap(addr).assign({
                address1: addrData.address1!,
                address2: addrData.address2,
                city: addrData.city!,
                state: addrData.state!,
                postalCode: addrData.postalCode!,
                country: addrData.country!
            });
            shippingAddress.address = addr;
        }
        
        if(addrData.locationType) shippingAddress.locationType = addrData.locationType as any;

        if(addrData.additionalNotes) shippingAddress.additionalNotes = addrData.additionalNotes as any;
    }

    protected assignLineItemFields(lineItem: LineItem): void {
        lineItem.type = this.validatedData.lineItem.type;
        lineItem.dangerousGoods = this.validatedData.lineItem.dangerousGoods;
        lineItem.measurementUnit = this.validatedData.lineItem.measurementUnit;
        lineItem.stackable = this.validatedData.lineItem.stackable;
    }

    protected buildUnitFields(unit: LineItemUnit, unitData: any, idx: number): void {
        unit.length = unitData.length;
        unit.width = unitData.width;
        unit.height = unitData.height;
        unit.weight = unitData.weight;
        unit.freightClass = unitData.freightClass;
        unit.nmfc = unitData.nmfc;
        unit.unitsOnPallet = unitData.unitsOnPallet;
        unit.palletUnitType = unitData.palletUnitType;
        unit.description = unitData.description ?? ""
    }

    protected buildSpotDetails() {
        const { spotContact: contact, spotEquipment, spotType } = this.validatedData.spotDetails;

        const spotDetails = new SpotDetails();
        const spotContact = new SpotContact();
        const spotEquipments = new SpotEquipment();
        
        wrap(spotContact).assign({
            contactName:    contact.contactName,
            phoneNumber:    contact.phoneNumber,
            email:          contact.email,
            shipDate:       contact.shipDate,
            deliveryDate:   contact.deliveryDate   ?? null,
            spotQuoteName:  contact.spotQuoteName  ?? null,
        })

        wrap(spotEquipments).assign({
            dryVan:         spotEquipment.dryVan,
            refrigerated:   spotEquipment.refrigerated,

        })

        spotDetails.spotContact  = spotContact;
        spotDetails.spotEquipment = spotEquipments;
        spotDetails.spotType = spotType;
        
        this.em.persist([spotEquipments, spotContact, spotDetails]);

        return spotDetails;
    }


    protected attachServiceToQuote(serviceEntity: PalletServices): void {
        console.log({data: this.validatedData})
        this.validatedData.palletServices = serviceEntity;
    }
}

