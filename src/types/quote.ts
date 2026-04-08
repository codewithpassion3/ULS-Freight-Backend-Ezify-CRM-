import { EntityManager } from "@mikro-orm/core";
import { SessionData } from "express-session";
import { AddressType } from "src/common/enum/address-type.enum";
import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { AddressBook } from "src/entities/address-book.entity";
import { Insurance } from "src/entities/insurance.entity";
import { LineItemUnit } from "src/entities/line-item-unit.entity";
import { LineItem } from "src/entities/line-item.entity";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type.entity";
import { Signature } from "src/entities/signature.entity";

export interface incomingQuotePayload {
    quote: PackageQuoteData
}

export interface PackageQuoteData {
    quoteType: string;
    shipmentType: string;
    addresses: AddressData[];
    lineItem: LineItem;
    insurance: Insurance;
    signature: Signature;
}

export interface AddressData extends AddressBook{
    type: AddressType;
    addressBookId?: number;
    locationType: PalletShippingLocationType;
    address1: string;
    address2: string;
    unit: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    saveToAddressBook: boolean;
}

export interface LineItemData {
    type: string;
    units: LineItemUnit[];
    dangerousGoods: boolean;
}
export interface QuoteConstructorParams {
    data: any;
    em: EntityManager;
    session: SessionData;
    shipmentType: ShipmentType;
}