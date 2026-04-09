import { wrap } from '@mikro-orm/core';
import { BadRequestException } from '@nestjs/common';
import { AddressBook } from 'src/entities/address-book.entity';
import { Address } from 'src/entities/address.entity';
import { Company } from 'src/entities/company.entity';
import { LineItemUnit } from 'src/entities/line-item-unit.entity';
import { LineItem } from 'src/entities/line-item.entity';
import { Quote } from 'src/entities/quote.entity';
import { ShippingAddress } from 'src/entities/shipping-address.entity';
import { User } from 'src/entities/user.entity';
import { validateAddress } from 'src/utils/validateAddress';
import { StandardQuote } from './standard-quote';
import { QuoteConstructorParams, AddressData } from './base-quote';
import { Mode } from 'src/common/enum/mode.enum';
import { packageRules } from 'src/common/constants/quote';
import { validateUnit } from 'src/utils/validateQuote';

export class PackageQuote extends StandardQuote {
    constructor(params: QuoteConstructorParams) {
        super();
        this.data = params.data;
        this.em = params.em;
        this.session = params.session;
    }

    async validate(): Promise<void> {
        this.errors = [];
        await this.validateAddresses();
        this.validateLineItem();
        this.validateLineItemUnits();
        this.validateInsurance();
        this.validateSignature();
        
        if (this.errors.length > 0) {
            throw new BadRequestException({
                message: this.errors
            });
        }

        // Store validated data for build phase
        this.validatedData = this.data.quote;
    }

    protected async validateAddressDetails(addresses: AddressData[]): Promise<void> {
        if (this.data.mode === Mode.SHIPMENT) {
            await this.validateShipmentAddresses(addresses);
        } else {
            this.validateQuoteAddresses(addresses);
        }
    }

    protected validateLineItemSpecific(): void {
        // Check: dangerousGoods required for packages
        if (this.data.quote.lineItem.dangerousGoods === undefined) {
            this.errors.push("dangerousGoods is required in package quote");
        }
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
        
    }

    async build(): Promise<Quote> {
        if (!this.validatedData) {
            this.errors.push('Must call validate() before build()');
        }

        const quote = new Quote();
        
        quote.quoteType = this.validatedData.quoteType;
        quote.shipmentType = this.validatedData.shipmentType;
        quote.status = this.validatedData.status;

        // Build relationships
        const addresses = await this.buildAddresses();
        addresses.forEach(addr => addr.quote = quote);
        quote.addresses.set(addresses);

        quote.lineItems = this.buildLineItem() as any;
        quote.insurance = this.buildInsurance();
        quote.signature = await this.buildSignature();
        quote.company = this.em.getReference(Company, this.session.companyId as number);
        quote.createdBy = this.em.getReference(User, this.session.userId as number);

        return quote;
    }

    protected assignLineItemFields(lineItem: LineItem): void {
        lineItem.type = this.validatedData.lineItem.type;
        lineItem.dangerousGoods = this.validatedData.lineItem.dangerousGoods;
        lineItem.measurementUnit = this.validatedData.lineItem.measurementUnit;
    }

    protected buildUnitFields(unit: LineItemUnit, unitData: any, idx: number): void {
        unit.length = unitData.length;
        unit.width = unitData.width;
        unit.height = unitData.height;
        unit.weight = unitData.weight;
    }

    protected processLineItemUnit(units: any): void {
        units.forEach((unit: any, idx: number) => {
                const result = validateUnit(unit, packageRules, { unitIndex: idx });
                if (result.errors) {
                    this.errors.push(...result.errors);
                }
        });
    }

    protected attachServiceToQuote(serviceEntity: any, shipmentType: string): void {
        //empty
    }
}