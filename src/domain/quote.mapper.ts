import { Quote } from "src/entities/quote.entity";
import { User } from "src/entities/user.entity";
import { Signature } from "src/entities/signature.entity";
import { Address } from "src/entities/address.entity";
import { ShippingAddress } from "src/entities/shipping-address.entity";
import { ShippingAddressMeta } from "src/entities/shipping-address-meta.entity";
import { LineItem } from "src/entities/line-item.entity";
import { LineItemUnit } from "src/entities/line-item-unit.entity";
import { Insurance } from "src/entities/insurance.entity";
import { SpotDetails } from "src/entities/spot-details.entity";
import { SpotEquipment } from "src/entities/spot-equipment.entity";
import { SpotContact } from "src/entities/spot-contact.entity";
import { EntityManager } from "@mikro-orm/core";

export class QuoteMapper {
    constructor(private readonly em: EntityManager) {}

    async map(dto: any, validated: any, currentUserId: number): Promise<Quote> {
        const quote = new Quote();

        /**
         * =====================
         * Base Quote
         * =====================
         */
        quote.quoteType = validated.quoteType ?? dto.quoteType;
        quote.status = validated.status ?? dto.status;
        quote.shipmentType = validated.shipmentType ?? dto.shipmentType;
        quote.createdBy = this.em.getReference(User, currentUserId);

        /**
         * =====================
         * Signature (optional)
         * =====================
         */
        if (
            validated.signature &&
            [dto.shipmentType].includes(dto.shipmentType)
        ) {
            quote.signature = this.em.getReference(Signature, validated.signature);
        }

        /**
         * =====================
         * Addresses
         * =====================
         */
        const addresses = validated.addresses ?? dto.addresses;

        if (addresses?.length) {
            quote.addresses = [] as any;

            for (const addrDto of addresses) {
                const shippingAddress = new ShippingAddress();
                const meta = new ShippingAddressMeta();

                shippingAddress.type = addrDto.type;

                if (addrDto.addressBookId) {
                    shippingAddress.addressBookEntry = addrDto.addressBookId
                } else {
                    const address = new Address();

                    Object.assign(address, {
                        address1: addrDto.address1,
                        city: addrDto.city,
                        state: addrDto.state,
                        country: addrDto.country,
                        postalCode: addrDto.postalCode
                    });

                    shippingAddress.address = address;

                    this.em.persist(address);
                }

                // Meta handling
                if (validated.quoteType === "SPOT") {
                    meta.additionalNotes = addrDto.additionalNotes ?? null;
                }

                if (
                    validated.quoteType !== "SPOT" &&
                    validated.shipmentType === "STANDARD_FTL"
                ) {
                    meta.includeStraps = addrDto.includeStraps ?? null;
                    meta.appointmentDelivery =
                        addrDto.appointmentDelivery ?? null;
                }

                shippingAddress.meta = meta;

                shippingAddress.quote = quote;

                this.em.persist([shippingAddress, meta]);

                quote.addresses.add(shippingAddress);
            }
        }

        /**
         * =====================
         * Line Item
         * =====================
         */
        const lineItemDto = validated.lineItem ?? dto.lineItem;

        if (lineItemDto) {
            const lineItem = new LineItem();

            lineItem.quote = quote;
            lineItem.type = lineItemDto.type;

            lineItem.measurementUnit = lineItemDto.measurementUnit;
            lineItem.dangerousGoods = lineItemDto.dangerousGoods ?? null;

            if (lineItemDto.units?.length) {
                lineItem.quantity = lineItemDto.units.length;

                lineItem.units = lineItemDto.units.map((unitDto: any) => {
                    const unit = new LineItemUnit();

                    Object.assign(unit, {
                        length: unitDto.length ?? null,
                        width: unitDto.width ?? null,
                        height: unitDto.height ?? null,
                        weight: unitDto.weight ?? null,
                        description: unitDto.description ?? null,
                        freightClass: unitDto.freightClass ?? null,
                        nmfc: unitDto.nmfc ?? null,
                        unitsOnPallet: unitDto.unitsOnPallet ?? null,
                        palletUnitType: unitDto.palletUnitType ?? null
                    });

                    unit.lineItem = lineItem;
                    unit.createdBy = this.em.getReference(User, currentUserId);

                    this.em.persist(unit);

                    return unit;
                });
            }

            this.em.persist(lineItem);
        }

        /**
         * =====================
         * Insurance
         * =====================
         */
        const insuranceDto = validated.insurance ?? dto.insurance;

        if (insuranceDto) {
            const insurance = new Insurance();

            insurance.quote = quote;
            insurance.amount = insuranceDto.amount;
            insurance.currency = insuranceDto.currency;

            this.em.persist(insurance);
        }

        /**
         * =====================
         * Spot Details
         * =====================
         */
        if (validated.quoteType === "SPOT" && dto.spotDetails) {
            const spotDetail = new SpotDetails();
            const spotEquipment = new SpotEquipment();
            const spotContact = new SpotContact();

            spotDetail.quote = quote;
            spotDetail.spotType = dto.spotDetails.spotType;

            Object.assign(spotContact, dto.spotDetails.spotContact);

            if (dto.shipmentType === "TIME_CRITICAL") {
                spotContact.deliveryDate = new Date(
                    dto.spotDetails.spotContact.deliveryDate
                );
            }

            if (dto.spotDetails.spotEquipment) {
                Object.assign(spotEquipment, dto.spotDetails.spotEquipment);
            }

            spotContact.spotDetail = spotDetail;
            spotEquipment.spotDetail = spotDetail;

            spotDetail.spotContact = spotContact;
            spotDetail.spotEquipment = spotEquipment;

            this.em.persist([spotDetail, spotContact, spotEquipment]);
        }

        /**
         * =====================
         * Services
         * =====================
         */
        const servicesDto = validated.services ?? dto.services;

        if (servicesDto) {
            Object.assign(quote, {
                palletServices: dto.shipmentType === "PALLET" ? servicesDto : undefined,
                spotFtlServices: dto.shipmentType === "SPOT_FTL" ? servicesDto : undefined,
                spotLtlServices: dto.shipmentType === "SPOT_LTL" ? servicesDto : undefined,
                standardFTLService:
                    dto.shipmentType === "STANDARD_FTL" ? servicesDto : undefined
            });
        }

        return quote;
    }
}