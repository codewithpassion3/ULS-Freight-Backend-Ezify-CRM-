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
import { QuoteConstructorParams, AddressData, AddressType } from "../base-quote";
import { StandardFtlServices } from "src/entities/standard-ftl-services.entity";
import { ShippingAddressMeta } from "src/entities/shipping-address-meta.entity";

export class StandardFTLQuote extends StandardQuote {
    constructor(params: QuoteConstructorParams) {
        super();
        this.data = params.data;
        this.em = params.em;
        this.session = params.session;
    }

    async validate(): Promise<void> {
        this.errors = [];
        await this.validateAddresses();
        this.validateServices();
        this.validateInsurance();
        
        if (this.errors.length > 0) {
            throw new BadRequestException({
                message: this.errors
            });
        }

        // Store validated data for build phase
        this.validatedData = this.data;
    }

    async build(): Promise<Quote> {
        if (!this.validatedData) {
            this.errors.push('Must call validate() before build()');
        }

        const quote = new Quote();
        this.validatedData.quote = quote;
        this.data = quote; // whichever you use internally
        console.log({data: this.data, validatedData: this.validatedData})
        
        quote.quoteType = this.validatedData.quoteType;
        quote.shipmentType = this.validatedData.shipmentType;
        quote.status = this.validatedData.status;

        // Build relationships
        const addresses = await this.buildAddresses();
        addresses.forEach(addr => addr.quote = quote);
        quote.addresses.set(addresses);

        quote.insurance = this.buildInsurance() as any;
        quote.company = this.em.getReference(Company, this.session.companyId as number);
        quote.createdBy = this.em.getReference(User, this.session.userId as number);
        
        await this.buildServices();

        return quote;
    }

    protected async validateAddressDetails(addresses: AddressData[]): Promise<void> {
        if (this.data.mode === Mode.SHIPMENT) {
            await this.validateShipmentAddresses(addresses);
        } else {
            this.validateQuoteAddresses(addresses);
        }
    }

    protected async buildAddressDetails(
        addrData: AddressData, 
        shippingAddress: ShippingAddress, 
        bookMap: Map<number, AddressBook>
    ): Promise<void> {
        const shippingAddressMeta = new ShippingAddressMeta();
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

        if(addrData.includeStraps && addrData.type === AddressType.FROM){
            shippingAddressMeta.includeStraps = addrData.includeStraps as boolean;
        }

        if(addrData.appointmentDelivery&& addrData.type === AddressType.TO){
            shippingAddressMeta.appointmentDelivery = addrData.appointmentDelivery as boolean;
        }

        shippingAddressMeta.shippingAddress = shippingAddress;
        shippingAddress.meta = shippingAddressMeta;
        this.em.persist(shippingAddressMeta)

    }

    protected attachServiceToQuote(serviceEntity: StandardFtlServices): void {
        this.validatedData.quote.standardFTLService = serviceEntity;
    }


    protected validateLineItemSpecific(): void {
        const hasLooseFreight = !!this.data.lineItem?.looseFreight;
        const hasPallet = !!this.data.lineItem?.pallet;
        if (hasLooseFreight && hasPallet) {
            this.errors.push(
                "Only one service allowed at a time: looseFreight OR pallet"
            );
        }
    }
    
    protected processLineItemUnit(units: any): void {}
    protected buildUnitFields(unit: LineItemUnit, unitData: any, idx: number): void {}
    protected assignLineItemFields(lineItem: LineItem): void {}
}

