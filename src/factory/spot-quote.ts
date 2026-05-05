import { RefrigeratedType } from "src/common/enum/refrigerated.enum";
import { BaseQuote } from "./base-quote";
import { EQUIPMENT_RULES } from "src/common/constants/spot-equipment";
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

            // Step 1: find provided fields
            const providedFields = allowedFields.filter(
                (field) => spotEquipment[field] !== undefined && spotEquipment[field] !== null
            );

            // Step 2: enforce only one field
            if (providedFields.length === 0) {
                errors.push(
                `spotDetails.spotEquipment must contain exactly one of: ${allowedFields.join(", ")}`
                );
            } else if (providedFields.length > 1) {
                errors.push(
                `spotDetails.spotEquipment must contain only one of: ${allowedFields.join(", ")}`
                );
            } else {
                // Step 3: validate the single field
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
                    if (typeof value !== "object") {
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

                default:
                    errors.push(`Invalid equipment type: ${field}`);
                }
            }
        }

        return errors;
    }
}