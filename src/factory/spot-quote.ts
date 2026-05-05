import { RefrigeratedType } from "src/common/enum/refrigerated.enum";
import { BaseQuote } from "./base-quote";
import { EQUIPMENT_RULES } from "src/common/constants/spot-equipment";
import { wrap } from "@mikro-orm/core";
import { SpotContact } from "src/entities/spot-contact.entity";
import { SpotDetails } from "src/entities/spot-details.entity";
import { SpotEquipment } from "src/entities/spot-equipment.entity";
export abstract class SpotQuote extends BaseQuote {
    constructor(){
        super();
    }

    protected validateSpotDetails(spotDetails: any, errors: any, shipmentType: any): string[] {
        if (typeof spotDetails !== "object" || spotDetails === null) {
            errors.push("spotDetails must be an object");
            return errors;
        }

        const { spotContact, spotEquipment } = spotDetails;
        // ─── spotContact ────────────────────────────────────────────────────────────────
        if (typeof spotContact !== "object" || spotContact === null) {
            errors.push("spotDetails.spotContact must be an object");
        } else {
            const { contactName, phoneNumber, email, shipDate, deliveryDate, spotQuoteName } = spotContact;

            if (typeof contactName !== "string" || !contactName.trim()) {
            errors.push("spotDetails.contact.contactName must be a non-empty string");
            }

            if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
            errors.push("spotDetails.contact.phoneNumber must be a non-empty string");
            }

            if (typeof email !== "string" || !email.trim()) {
            errors.push("spotDetails.contact.email must be a non-empty string");
            }

            if (!shipDate || isNaN(new Date(shipDate).getTime())) {
            errors.push("spotDetails.contact.shipDate must be a valid date");
            }

            if (deliveryDate !== undefined && deliveryDate !== null && isNaN(new Date(deliveryDate).getTime())) {
            errors.push("spotDetails.contact.deliveryDate must be a valid date or null");
            }

            if (spotQuoteName !== undefined && spotQuoteName !== null && typeof spotQuoteName !== "string") {
            errors.push("spotDetails.contact.spotQuoteName must be a string or null");
            }
        }

        // ─── spotEquipment ──────────────────────────────────────────────────────────
        if (typeof spotEquipment !== "object" || spotEquipment === null) {
            errors.push("spotDetails.spotEquipment must be an object");
        } else {
            const allowedFields = EQUIPMENT_RULES[shipmentType] || [];

            // Step 1: detect provided fields
            const providedFields = allowedFields.filter(
                (field) =>
                spotEquipment[field] !== undefined &&
                spotEquipment[field] !== null
            );

            if (providedFields.length > 1) {
                errors.push(
                `spotDetails.spotEquipment must contain only one of: ${allowedFields.join(", ")}`
                );
                return errors;
            }


            if (providedFields.length === 0) {
                errors.push(
                `spotDetails.spotEquipment must contain exactly one of: ${allowedFields.join(", ")}`
                );
                return errors;
            }

            const field = providedFields[0];
            const value = spotEquipment[field];

            switch (field) {
                case "dryVan":
                case "flatbed":
                case "ventilated":
                if (typeof value !== "boolean") {
                    errors.push(`spotDetails.spotEquipment.${field} must be a boolean`);
                }
                break;

                case "refrigerated":
                if (typeof value !== "object" || value === null) {
                    errors.push("spotDetails.spotEquipment.refrigerated must be an object");
                } else {
                    const { type } = value;
                    if (!type || !Object.values(RefrigeratedType).includes(type)) {
                    errors.push(
                        `spotDetails.spotEquipment.refrigerated.type has invalid value. Allowed values are: ${Object.values(RefrigeratedType).join(", ")}`
                    );
                    }
                }
                break;

                case "nextFlightOut":
                if (typeof value !== "object" || value === null) {
                    errors.push("spotDetails.spotEquipment.nextFlightOut must be an object");
                } else {
                    const { knownShipper } = value;

                    if (
                    knownShipper !== undefined &&
                    knownShipper !== null &&
                    typeof knownShipper !== "boolean"
                    ) {
                    errors.push(
                        "spotDetails.spotEquipment.nextFlightOut.knownShipper must be a boolean"
                    );
                    }
                }
                break;

                default:
                errors.push(`Invalid equipment type: ${field}`);
            }
        }

        return errors;
    }

    protected buildSpotDetails(spotDetailsObj: any) {
            const { spotContact: contact, spotEquipment, spotType } = spotDetailsObj;
    
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
    
            // Get allowed equipment fields for this shipment type
            const allowedEquipment = EQUIPMENT_RULES[spotType] || [];
    
            // Filter spotEquipment to only include allowed fields
            const filteredEquipment = Object.fromEntries(
                Object.entries(spotEquipment).filter(([key]) => allowedEquipment.includes(key))
            );

            // return;
            wrap(spotEquipments).assign(filteredEquipment);
    
            spotDetails.spotContact  = spotContact;
            spotDetails.spotEquipment = spotEquipments;
            spotDetails.spotType = spotType;
            
            this.em.persist([spotEquipments, spotContact, spotDetails]);
            
            return spotDetails;
        }
    
}