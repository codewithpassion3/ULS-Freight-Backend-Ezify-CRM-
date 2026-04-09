import { EntityManager, wrap } from '@mikro-orm/core';
import { BadRequestException } from '@nestjs/common';
import { SessionData } from 'express-session';
import { packageRules, palletRules } from 'src/common/constants/quote';
import { Mode } from 'src/common/enum/mode.enum';
import { AddressBook } from 'src/entities/address-book.entity';
import { Address } from 'src/entities/address.entity';
import { Company } from 'src/entities/company.entity';
import { Insurance } from 'src/entities/insurance.entity';
import { LineItemUnit } from 'src/entities/line-item-unit.entity';
import { LineItem } from 'src/entities/line-item.entity';
import { PalletServices } from 'src/entities/pallet-services.entity';
import { PalletShippingLocationType } from 'src/entities/pallet-shipping-location-type.entity';
import { ShippingAddress } from 'src/entities/shipping-address.entity';
import { Signature } from 'src/entities/signature.entity';
import { SpotFtlServices } from 'src/entities/spot-ftl-services.entity';
import { SpotLtlServices } from 'src/entities/spot-ltl-services.entity';
import { StandardFtlServices } from 'src/entities/standard-ftl-services.entity';
import { User } from 'src/entities/user.entity';
import { validateAddress } from 'src/utils/validateAddress';
import { validateServicesAgainstQuote, validateUnit } from 'src/utils/validateQuote';

export interface QuoteConstructorParams {
    data: any;
    em: EntityManager;
    session: SessionData;
}

export enum AddressType {
    FROM = 'FROM',
    TO = 'TO'
}

export interface AddressData {
    type: AddressType;
    addressBookId?: number;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    companyName?: string;
    contactName?: string;
    contactId?: string;
    phoneNumber?: string;
    email?: string;
    defaultInstructions?: string;
    palletShippingReadyTime?: string;
    palletShippingCloseTime?: string;
    isResidential?: boolean;
    saveToAddressBook?: boolean;
    locationType: number;
    signatureId?: number;
    companyId?: number;
    userId?: number;
}

export abstract class BaseQuote {
    protected errors: string[] = [];
    protected data: any;
    protected em!: EntityManager;
    protected session!: SessionData;
    protected validatedData!: any;
    protected mode!: Mode;
    
    // Template method with common logic
    protected async validateAddresses(): Promise<void> {
        console.log({data: this.data.quote.addresses, length: this.data.quote.addresses.length})
        const addresses = this.data.quote.addresses;
        if (!addresses || addresses.length === 0) {
            console.log("Throwing error")
            this.errors.push("Addresses (TO & FROM) are required");
            return;
        }

        const fromAddress = addresses.find((a: AddressData) => a.type === AddressType.FROM);
        const toAddress = addresses.find((a: AddressData) => a.type === AddressType.TO);

        if (!fromAddress) this.errors.push("FROM address is missing");
        if (!toAddress) this.errors.push("TO address is missing");
        if (addresses.length !== 2) {
            this.errors.push(`Exactly 2 addresses (TO & FROM) are required`);
        }

        const normalizedAddresses = addresses.map((addr: AddressData) => ({
            ...addr,
            locationType: addr.locationType ?? undefined,
        }));

        // Delegate to derived implementation
        await this.validateAddressDetails(normalizedAddresses);
    }

    protected validateLineItem(): void {
        // 1) Line item required
        if (!this.data.quote.lineItem) {
            this.errors.push("Line item is required");
            return;
        }

        // 2) Units required
        if (!this.data.quote.lineItem.units || this.data.quote.lineItem.units.length === 0) {
            this.errors.push("At least one unit is required");
        }

        // 3) Type must match shipment type
        if (this.data.quote.lineItem.type !== this.data.quote.shipmentType) {
            this.errors.push("Line item type must match shipment type");
        }

        // 4) Hook for child-specific validation
        this.validateLineItemSpecific();
    }

    protected validateLineItemUnits(): void {
        if (!this.data.quote.lineItem?.units?.length) return;

        const units = this.data.quote.lineItem.units;

       this.processLineItemUnit(units)
    }

    protected validateServices(): void {
        const errors = validateServicesAgainstQuote(this.data.quote.services, this.data.quote.shipmentType)
        this.errors.push(...errors);
    }
    
    protected validateInsurance(): void {
        if (!this.data.quote.insurance) {
            this.errors.push("Insurance is required");
            return;
        }

        if (this.data.quote.insurance.amount <= 0) {
            this.errors.push("Insurance value must be greater than 0");
        }

        if (!this.data.quote.insurance.currency) {
            this.errors.push("Insurance currency is required");
        }
    }

    protected validateSignature(): void {
        const signature = this.data.quote.signature;
        if (!signature) {
            this.errors.push("Signature is required");
            return;
        }
    }
    
    protected async buildAddresses(): Promise<ShippingAddress[]> {
        const bookIds = this.validatedData.addresses
            .filter((a: AddressData) => a.addressBookId)
            .map((a: AddressData) => a.addressBookId);
                
        const existingBooks = bookIds.length > 0 
            ? await this.em.find(AddressBook, { id: { $in: bookIds } }, { populate: ['address'] })
            : [];

        if (existingBooks.length !== bookIds.length) {
            const foundIds = new Set(existingBooks.map(b => b.id));
            const missing = bookIds.filter(id => !foundIds.has(id));
            throw new BadRequestException(`AddressBook IDs not found: ${missing.join(', ')}`);
        }

        const bookMap = new Map(existingBooks.map(b => [b.id, b]));

        return Promise.all(this.validatedData.addresses.map(async (addrData: AddressData) => {
            const shippingAddress = new ShippingAddress();
            shippingAddress.type = addrData.type;
            shippingAddress.locationType = addrData.locationType as any;

            await this.buildAddressDetails(addrData, shippingAddress, bookMap);
            
            return shippingAddress;
        }));
    }

    protected buildUnits(): LineItemUnit[] {
        return this.validatedData.lineItem.units.map((unitData: any, idx: number) => {
            const unit = new LineItemUnit();
            
            // Common fields (always present)
            unit.description = unitData.description ?? "";
            unit.createdBy = this.em.getReference(User, this.session.userId as number);
            unit.company = this.em.getReference(Company, this.session.companyId as number);
            
            // Dynamic fields - delegate to child
            this.buildUnitFields(unit, unitData, idx);
            
            return unit;
        });
    }

    protected buildLineItem(): LineItem {
        const lineItem = new LineItem();
        
        // Hook for derived classes to assign dynamic fields
        this.assignLineItemFields(lineItem);
        
        // Common: units assignment (always happens)
        const units = this.buildUnits();
        lineItem.units = units as any;
        lineItem.quantity = units.length;
        
        return lineItem;
    }

    protected buildServices(): void {
        const serviceFactoryMap = {
            STANDARD_FTL: () => new StandardFtlServices(),
            PALLET: () => new PalletServices(),
            SPOT_FTL: () => new SpotFtlServices(),
            SPOT_LTL: () => new SpotLtlServices(),
        };
        
        const shipmentType = this.data.quote.shipmentType;
        
        const factory = serviceFactoryMap[shipmentType];
        
        if (!factory) throw new Error('Unsupported type');

        const serviceEntity = factory();
        
        serviceEntity.quote = this.data.quote;
        
        this.attachServiceToQuote(serviceEntity, shipmentType);
    }

    protected buildInsurance(): Insurance {
        const insurance = new Insurance();
        insurance.amount = this.validatedData.insurance.amount;
        insurance.currency = this.validatedData.insurance.currency;
        return insurance;
    }

    protected async buildSignature(): Promise<Signature> {
        const signature = await this.em.findOne(Signature, { id: this.validatedData.signature });
        
        if (!signature) {
            throw new BadRequestException(`Invalid signature id: ${this.validatedData.signature}`);
        }
       
        return signature as Signature;
    }

   
    protected abstract processLineItemUnit(units: any): void;
    protected abstract attachServiceToQuote(serviceEntity: any, shipmentType: string): void;
    protected abstract assignLineItemFields(lineItem: LineItem): void;
    protected abstract buildUnitFields(unit: LineItemUnit, unitData: any, idx: number): void;
    protected abstract validateAddressDetails(addresses: AddressData[]): Promise<void>;
    protected abstract validateLineItemSpecific(): void;
    protected abstract buildAddressDetails(
        addrData: AddressData, 
        shippingAddress: ShippingAddress, 
        bookMap: Map<number, AddressBook>
    ): Promise<void>;

    // Helper available to all derived classes
    protected hasAddressBookFields(addr: AddressData): boolean {
        return !!(addr.companyName || addr.contactName || addr.phoneNumber || 
                addr.email || addr.contactId || addr.defaultInstructions ||
                addr.palletShippingReadyTime || addr.palletShippingCloseTime);
    }

    protected createAddressBook(data: AddressData): AddressBook {
        const book = new AddressBook();
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
            company: this.em.getReference(Company, data.companyId!),
            createdBy: this.em.getReference(User, data.userId!),
            signature: this.em.getReference(Signature, data.signatureId!),
            locationType: this.em.getReference(PalletShippingLocationType, data.locationType!)
        });

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

    protected resetServiceRelations(): void {
    this.data.quote.standardFTLService = null;
    this.data.quote.palletServices = null;
    this.data.quote.spotFtlServices = null;
    this.data.quote.spotLtlServices = null;
}
    protected async validateShipmentAddresses(addresses: AddressData[]): Promise<void> {
        for (const address of addresses) {
            if (address.addressBookId) {
                // Case 1: Existing ID - no extra fields allowed
                const hasExtra = this.hasAddressBookFields(address) || 
                            !!(address.address1 || address.city || address.state || address.postalCode || address.country);
                if (hasExtra) {
                    this.errors.push(`Address '${address.type}': addressBookId cannot be mixed with other fields`);
                }

                // ADD: Check if AddressBook actually exists
                const bookExists = await this.em.count(AddressBook, { id: address.addressBookId });
                if (bookExists === 0) {
                    this.errors.push(`Address '${address.type}': AddressBook ${address.addressBookId} not found`);
                }
            } else {
                // Case 2: New AddressBook - check all required
                const required = [
                    'companyName', 'contactName', 'phoneNumber', 
                    'palletShippingReadyTime', 'palletShippingCloseTime',
                    'signatureId', 'locationType', 'address1', 'city', 'state', 'postalCode', 'country'
                ];

                const missing = required.filter(field => !(address as any)[field]);
                if (missing.length > 0) {
                    missing.forEach(field => {
                        this.errors.push(`Address '${address.type}': Missing required field '${field}'`);
                    });
                }
            }
        }
    }

    protected validateQuoteAddresses(addresses: AddressData[]): void {
        for (const address of addresses) {
            const addressErrors = validateAddress(address as any, this.data.quote.quoteType);
            this.errors.push(...addressErrors);
        }
    }
}