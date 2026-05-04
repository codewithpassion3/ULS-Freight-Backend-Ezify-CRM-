import { RefrigeratedType } from "src/common/enum/refrigerated.enum";
import { BaseQuote } from "./base-quote";
export abstract class SpotQuote extends BaseQuote {
    constructor(){
        super();
    }

    protected validateSpotDetails(spotDetails: any, errors: any): string[] {
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
            const { dryVan, refrigerated } = spotEquipment;

            const booleanFields: [string, unknown][] = [["dryVan", dryVan]];

            for (const [name, val] of booleanFields) {
            if (val !== undefined && val !== null && typeof val !== "boolean") {
                errors.push(`spotDetails.spotEquipment.${name} must be a boolean or null`);
            }
            }

            // van — boolean with extra shape check
            if (dryVan !== undefined && dryVan !== null && typeof dryVan !== "boolean") {
            errors.push("spotDetails.spotEquipment.dryVan must be a boolean or null");
            }

            // refrigerated — validate object shape and enum value
            if (refrigerated !== undefined && refrigerated !== null) {
            if (typeof refrigerated !== "object") {
                errors.push("spotDetails.spotEquipment.refrigerated must be an object or null");
            } else {
                const { type } = refrigerated;
                if (!type || !Object.values(RefrigeratedType).includes(type)) {
                errors.push(
                    `spotDetails.spotEquipment.refrigerated.type has invalid value. Allowed values are: ${Object.values(RefrigeratedType).join(", ")}`
                );
                }
            }
            }
        }

        return errors;
    }
}