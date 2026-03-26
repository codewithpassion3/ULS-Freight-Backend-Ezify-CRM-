import { EntityManager } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable } from "@nestjs/common";
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

@Injectable()
export class QuoteService {
    constructor(private readonly em: EntityManager) {}

    async create(dto: CreateQuoteDTO, currentUserId: number) {
        const { valid, errors } = validateQuote(dto);
        
        if (!valid) { throw new BadRequestException(errors); }
        const em = this.em.fork();

        let signature: Signature | null = null;

        if(ShipmentType.COURIER_PACK === dto.shipmentType || ShipmentType.PACKAGE === dto.shipmentType){
            signature = await em.findOne(Signature, { id: dto.signature });

            if (!signature) {
                throw new BadRequestException("Invalid signature id");
            }
        }

        const quote = new Quote();
        quote.quoteType = dto.quoteType;
        quote.shipmentType = dto.shipmentType;
        quote.createdBy = em.getReference(User, currentUserId);

        if(ShipmentType.COURIER_PACK  === dto.shipmentType || ShipmentType.PACKAGE === dto.shipmentType) quote.signature = signature;

        em.persist(quote);

        /* -------------------- ADDRESSES -------------------- */
        if (dto.addresses?.length) {
            for (const addrDto of dto.addresses) {
                const shippingAddress = new ShippingAddress();
                const shippingAddressMeta = new ShippingAddressMeta();

                shippingAddress.type = addrDto.type;
                shippingAddress.quote = quote;

                // Address book vs manual address (mutually exclusive)
                if (addrDto.addressBookId) {
                    shippingAddress.addressBookEntry = em.getReference(
                        AddressBook,
                        addrDto.addressBookId
                    );
                } else {
                    const address = new Address();

                    address.address1 = addrDto.address1!;
                    address.city = addrDto.city!;
                    address.state = addrDto.state!;
                    address.country = addrDto.country!;
                    address.postalCode = addrDto.postalCode!;

                    shippingAddress.address = address;
                    shippingAddress.isResidential = addrDto.isResidential!;

                    em.persist(address);

                    if (addrDto.locationType) {
                        shippingAddress.locationType = em.getReference(
                            PalletShippingLocationType,
                            addrDto.locationType
                        );
                    }
                }

                // Meta rules
                if (
                    dto.quoteType !== 'SPOT' &&
                    dto.shipmentType === ShipmentType.FTL
                ) {
                    shippingAddressMeta.includeStraps =
                        addrDto.includeStraps ?? null;
                    shippingAddressMeta.appointmentDelivery =
                        addrDto.appointmentDelivery ?? null;
                }

                if (dto.quoteType === 'SPOT') {
                    shippingAddressMeta.additionalNotes =
                        addrDto.additionalNotes ?? null;
                }

                shippingAddress.meta = shippingAddressMeta;

                em.persist([shippingAddress, shippingAddressMeta]);
            }
        }

        /* -------------------- LINE ITEMS -------------------- */
        if (dto.lineItem) {
            const lineItem = new LineItem();

            lineItem.quote = quote;
            lineItem.type = dto.lineItem.type;
            lineItem.dangerousGoods = dto.lineItem.dangerousGoods ?? null;
            lineItem.description = dto.lineItem.description ?? null;
            em.persist(lineItem);

            for (const unitDto of dto.lineItem.units) {
                const unit = new LineItemUnit();

                unit.lineItem = lineItem;
                unit.quantity = unitDto.quantity ?? null;
                unit.length = unitDto.length ?? null;
                unit.width = unitDto.width ?? null;
                unit.height = unitDto.height ?? null;
                unit.weight = unitDto.weight ?? null;
                unit.freightClass = unitDto.freightClass ?? null;
                unit.nmfc = unitDto.nmfc ?? null;
                unit.stackable = unitDto.stackable ?? null;

                em.persist(unit);
            }
        }

        /* -------------------- INSURANCE -------------------- */
        if (dto.insurance) {
            const insurance = new Insurance();

            insurance.quote = quote;
            insurance.amount = dto.insurance.amount;
            insurance.currency = dto.insurance.currency;

            em.persist(insurance);
        }

        /* -------------------- SPOT DETAILS -------------------- */
        if (dto.spotDetails) {
            const spot = new SpotDetails();
            const spotEquipment = new SpotEquipment();
            const spotContact = new SpotContact();

            spot.quote = quote;

            spotContact.contactName = dto.spotDetails.contactName;
            spotContact.phoneNumber = dto.spotDetails.phoneNumber;
            spotContact.email = dto.spotDetails.email;
            spotContact.shipDate = new Date(dto.spotDetails.shipDate);
            spotContact.deliveryDate = new Date(
                dto.spotDetails.deliveryDate
            );
            spotContact.spotQuoteName =
                dto.spotDetails.spotQuoteName ?? null;

            if (dto.spotDetails.equipmentType) {
                spotEquipment.type = dto.spotDetails
                    .equipmentType as EquipmentType;
            }

            quote.knownShipper = dto.spotDetails.knownShipper ?? false;

            spot.spotContact = spotContact;
            spot.spotEquipment = spotEquipment;

            em.persist([spot, spotContact, spotEquipment]);
        }

        /* -------------------- FINAL FLUSH -------------------- */
        await em.flush();

        return quote;
    }

    async getSingleAgainstCurrentUser(quoteId: number, currentUserId: number){
        //1) Get the quote against current user
        const quote = await this.em.findOne(Quote, {
            id: quoteId,
            createdBy: this.em.getReference(User, currentUserId)
        },{
            populate: ["addresses", "addresses.addressBookEntry","lineItems", "lineItems.units",
                        "palletServices", "spotFtlServices", "spotLtlServices", "standardFTLService", 
                        "signature", "spotDetails"]
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
}