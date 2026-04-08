import { Quote } from "src/entities/quote.entity";
import { StandardQuote } from "./standard-quote";
import { BadRequestException } from "@nestjs/common";
import { packageRules } from "src/common/constants/quote";
import { Address } from "src/entities/address.entity";
import { LineItem } from "src/entities/line-item.entity";
import { Insurance } from "src/entities/insurance.entity";
import { Signature } from "src/entities/signature.entity";
import { LineItemUnit } from "src/entities/line-item-unit.entity";
import { QuoteStatus } from "src/common/enum/quote-status";
import { validateAddress } from "src/utils/validateAddress";
import { validateUnit } from "src/utils/validateQuote";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { ShippingAddress } from "src/entities/shipping-address.entity";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type.entity";
import { AddressType } from "src/common/enum/address-type.enum";
import { AddressBook } from "src/entities/address-book.entity";
import { EntityManager, wrap } from "@mikro-orm/core";
import { SessionData } from "express-session";
import { Company } from "src/entities/company.entity";
import { User } from "src/entities/user.entity";
import { QuoteConstructorParams, AddressData } from "src/types/quote";
import { Mode } from "src/common/enum/mode.enum";


export class PackageQuote extends StandardQuote {
    private errors: string[] = [];
    private validatedData!: any;
    private data: any;
    private em: EntityManager;
    private session: SessionData;

    constructor(params: Pick<QuoteConstructorParams, "data" | "em" | "session">) {
        super();

        this.data = params.data;
        this.em = params.em;
        this.session = params.session
    }

    validateAndReturn(): void {
        
    }

    validate(): void {
        this.errors = [];
        this.validateAddresses(this.data.mode);
        this.validateLineItem();
        this.validateLineItemUnits();
        this.validateInsurance();
        this.validateSignature();
        
        if (this.errors.length > 0) {
            throw new BadRequestException({
                message:  this.errors
            });
        }

        // Store validated data for build phase
        this.validatedData = this.data.quote;
    }

    private hasAddressBookFields(addr: AddressData): boolean {
        return !!(addr.companyName || addr.contactName || addr.phoneNumber || 
                addr.email || addr.contactId || addr.defaultInstructions ||
                addr.palletShippingReadyTime || addr.palletShippingCloseTime);
    }

    private validateShipmentAddresses(addresses: AddressData[]): void {
        for (const address of addresses) {
            if (address.addressBookId) {
                // Case 1: Existing ID - no extra fields allowed
                const hasExtra = this.hasAddressBookFields(address) || 
                            !!(address.address1 || address.city || address.state || address.postalCode || address.country);
                if (hasExtra) {
                    this.errors.push(`Address '${address.type}': addressBookId cannot be mixed with other fields`);
                }
            } else {
                // Case 2: New AddressBook - check all required
                const required = [
                    'companyName', 'contactName', 'phoneNumber', 
                    'palletShippingReadyTime', 'palletShippingCloseTime',
                    'signatureId', 'locationType', 'address1', 'city', 'state', 'postalCode', 'country'
                ];
                
                const missing = required.filter(field => !address[field]);
                
                if (missing.length > 0) {
                    this.errors.push(
                        `Address '${address.type}': Missing required fields: ${missing.join(', ')}`
                    );
                }
            }
        }
    }

    private validateQuoteAddresses(addresses: AddressData[]): void {
        for (const address of addresses) {
            const addressErrors = validateAddress(address as any, this.data.quote.quoteType);
            this.errors.push(...addressErrors);
        }
    }

    private createAddressBook(data: AddressData): AddressBook {
        const book = new AddressBook();
        
        // Simple fields using MikroORM assign
        wrap(book).assign({
            companyName: data.companyName!,
            contactName: data.contactName!,
            contactId: data.contactId,
            phoneNumber: data.phoneNumber!,
            email: data.email,
            defaultInstructions: data.defaultInstructions,
            palletShippingReadyTime: data.palletShippingReadyTime!,
            palletShippingCloseTime: data.palletShippingCloseTime!,
            isResidential: data.isResidential ?? false,
            isTemporary: data.saveToAddressBook === false,
            company: this.em.getReference(Company, this.data.companyId),
            createdBy: this.em.getReference(User, this.data.userId),
            signature: this.em.getReference(Signature, this.validatedData.signature),
            locationType: this.em.getReference(PalletShippingLocationType, this.validatedData.locationType)
        });

        // Linked address
        const addr = new Address();
        wrap(addr).assign({
            address1: data.address1!,
            address2: data.address2,
            city: data.city!,
            state: data.state!,
            postalCode: data.postalCode!,
            country: data.country!
        });
        
        book.address = addr;
        return book;
    }

    async build(): Promise<Quote> {
        if (!this.validatedData) {
            this.errors.push('Must call validate() before build()');
        }

        const quote = new Quote();
        
        quote.quoteType = this.validatedData.quoteType as QuoteType;
        quote.shipmentType = this.validatedData.shipmentType as ShipmentType;
        quote.status = this.validatedData.status as QuoteStatus;

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


    private validateAddresses(mode: Mode = Mode.QUOTE): void {
        const addresses = this.data.quote.addresses;
        if (!addresses || addresses.length === 0) {
            this.errors.push("Addresses (TO & FROM) are required");
            return;
        }

        // 1) Check TO/FROM presence
        const fromAddress = addresses.find(a => a.type === AddressType.FROM);
        const toAddress = addresses.find(a => a.type === AddressType.TO);

        if (!fromAddress) this.errors.push("FROM address is missing");
        if (!toAddress) this.errors.push("TO address is missing");
        if (addresses.length !== 2) {
            this.errors.push(`Exactly 2 addresses (TO & FROM) are allowed in addresses`);
        }

        const normalizedAddresses = this.data.quote.addresses.map((addr: AddressData) => ({
            ...addr,
            locationType: addr.locationType ?? undefined,
        }));

        // Route to appropriate validation logic
        if (mode === Mode.SHIPMENT) {
            this.validateShipmentAddresses(normalizedAddresses);
        } 

        if (mode === Mode.QUOTE) {
            this.validateQuoteAddresses(normalizedAddresses);
        }
    }
    
    private validateLineItem(): void {
        //1) Throw error for invalid lineItem payload
        if (!this.data.quote.lineItem) {
            this.errors.push("Line item is required for package quote");
            return;
        }

        //2) Throw error for invalid units payload inside line item
        if (!this.data.quote.lineItem.units || this.data.quote.lineItem.units.length === 0) {
            this.errors.push("At least one unit is required for package quote");
        }

        //3) Throw error for line item type mis-match
        if (this.data.quote.lineItem.type !== this.data.quote.shipmentType) {
            this.errors.push("Line item type must match shipment type");
        }

        //4) Throw error for missing field
        if (this.data.quote.lineItem.dangerousGoods === undefined) {
            this.errors.push("dangerousGoods is required in package quote");
        }
    }

    private validateLineItemUnits(): void {
        //1) Return for missing line item units
        if (!this.data.quote.lineItem?.units?.length) return;

        //2) Validate each item keys inside line item unit
        const units = this.data.quote.lineItem.units as any;

        units.forEach((unit: LineItemUnit, idx: number) => { // Add types
            const result = validateUnit(unit, packageRules, { unitIndex: idx });
            if (result.errors) { // Check if errors exist
                this.errors.push(...result.errors);
            }
        });
    }

    private validateInsurance(): void {
        //1) Throw errors for invalid insurance payload
        if (!this.data.quote.insurance) {
            this.errors.push("insurance is required in package quote");
            return;
        }

        //2) Throw error if amount is negative
        if (this.data.quote.insurance.amount <= 0) {
            this.errors.push("insurance value must be greater than 0");
        }

        //3) Throw error for un-supported currency
        if (!this.data.quote.insurance.currency) {
            this.errors.push("insurance currency is required");
        }
    }

    private  validateSignature()  {
        //1) Throw error for missing signature
        const signature = this.data.quote.signature;
        if (!signature) {
            this.errors.push("signature is required in package quote");
            return;
        }
    }

    private async buildAddresses(): Promise<ShippingAddress[]> {
        const bookIds = this.validatedData.addresses
            .filter(a => a.addressBookId)
            .map(a => a.addressBookId);
        
        const existingBooks = bookIds.length > 0 
            ? await this.em.find(AddressBook, { id: { $in: bookIds } }, { populate: ['address'] })
            : [];

        const bookMap = new Map(existingBooks.map(b => [b.id, b]));

        return Promise.all(this.validatedData.addresses.map(async (addrData: AddressData) => {
            const shippingAddress = new ShippingAddress();
            shippingAddress.type = addrData.type;
            shippingAddress.locationType = addrData.locationType as PalletShippingLocationType;

            if (addrData.addressBookId) {
                // CASE 1: Existing AddressBook - ONLY set addressBookEntry
                const addressBook = bookMap.get(addrData.addressBookId);
                if (!addressBook) {
                    this.errors.push(`AddressBook ${addrData.addressBookId} not found`);
                }
                
                shippingAddress.addressBookEntry = this.em.getReference(AddressBook, addrData.addressBookId);
                // shippingAddress.address remains undefined (mutually exclusive)
            } 
            else if (this.data.mode === Mode.SHIPMENT) {
                // CASE 2: Shipment mode - Create temporary AddressBook with nested Address
                const addressBook = this.createAddressBook(addrData);
                this.em.persist(addressBook);
                shippingAddress.addressBookEntry = addressBook;
                // shippingAddress.address remains undefined (address is inside AddressBook)
            }
            else {
                // CASE 3: Quote mode - Pure manual address, NO AddressBook wrapper
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
                // shippingAddress.addressBookEntry remains undefined
            }

            return shippingAddress;
        }));
    }

    private buildLineItem(): LineItem {
        //1) Build and return line item entity
        const lineItem = new LineItem();
        
        lineItem.type = this.validatedData.lineItem.type as ShipmentType;
        lineItem.dangerousGoods = this.validatedData.lineItem.dangerousGoods;
        lineItem.measurementUnit = this.validatedData.lineItem.measurementUnit;
        lineItem.units = this.buildUnits() as any;

        return lineItem;
    }

    private buildUnits(): LineItemUnit[] {
        //1) Build and return line item units
        return this.validatedData.lineItem.units.map((unitData: LineItemUnit, idx: number) => {
            const unit = new LineItemUnit();
            
            unit.length = unitData.length;
            unit.width = unitData.width;
            unit.height = unitData.height;
            unit.weight = unitData.weight;
            unit.description = unitData.description ?? ""
            unit.createdBy = this.em.getReference(User, this.session.userId as number);
            unit.company = this.em.getReference(Company, this.session.companyId as number);

            
            return unit;
        });
    }

    private buildInsurance(): Insurance {
        //1) Build and return insurance
        const insurance = new Insurance();
        insurance.amount = this.validatedData.insurance.amount;
        insurance.currency = this.validatedData.insurance.currency;
        return insurance;
    }

    private async buildSignature(): Promise<Signature> {
        //1) Build and return signature
        const signature = await this.em.findOne(Signature, { id: this.validatedData.signature });
        
        if (!signature) this.errors.push("Invalid signature id");
       
        return signature as Signature;
    }

}