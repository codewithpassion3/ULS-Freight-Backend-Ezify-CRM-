// src/modules/quote/validators/validateUpdateQuote.ts

import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { LineItemDTO, UpdateQuoteDTO } from "../modules/quote/dto/update-quote.dto";
import { Quote } from "src/entities/quote.entity";
import { VALID_STATUS_TRANSITIONS } from "src/common/constants/valid-quote-status"; // Import status transitions
import { filterUpdateFields } from "../utils/filter-quote-update-fields";
import { validateAddress } from "./validateAddress";
import { validateSpotDetails } from "./validateSpotDetails";
import { getLineItemFields, getRules, getUpdateRules, validateUnit } from "./validateQuote";
import { AddressDto } from "src/modules/address-book/dto/address-book.dto";

export interface UpdateValidationResult {
  valid: boolean;
  errors: string[];
  filteredDto?: UpdateQuoteDTO;
  removedFields?: string[];
}

/**
 * Shipment types that ALLOW insurance
 */
const INSURANCE_ALLOWED_SHIPMENTS = [
  ShipmentType.STANDARD_FTL,
  ShipmentType.PACKAGE,
  ShipmentType.PALLET,
];

/**
 * Shipment types that FORBID insurance
 */
const INSURANCE_FORBIDDEN_SHIPMENTS = [
  ShipmentType.COURIER_PAK,
  ShipmentType.SPOT_FTL,
  ShipmentType.SPOT_LTL,
  ShipmentType.TIME_CRITICAL,
];

export function validateUpdateQuote(
  dto: UpdateQuoteDTO,
  existingQuote: Quote
): UpdateValidationResult {
  const errors: string[] = [];
  const shipmentType = existingQuote.shipmentType as ShipmentType;
  const quoteType = existingQuote.quoteType as QuoteType;

  // Step 1: Filter fields
  const originalKeys = Object.keys(dto);
  const filteredRaw = filterUpdateFields(dto as Record<string, any>, shipmentType);
  const filteredKeys = Object.keys(filteredRaw);
  const removedFields = originalKeys.filter(k => !filteredKeys.includes(k) && k !== "shipmentType" && k !== "quoteType");

  const filteredDto = filteredRaw as UpdateQuoteDTO;

  // 3.1 Immutable fields check
  if (dto.quoteType && dto.quoteType !== existingQuote.quoteType) {
    errors.push("Cannot change quoteType after creation");
  }
  if (dto.shipmentType && dto.shipmentType !== existingQuote.shipmentType) {
    errors.push("Cannot change shipmentType after creation");
  }

  // ============================================
  // 3.2 STATUS TRANSITION VALIDATION
  // ============================================
  if (filteredDto.status) {
    const currentStatus = existingQuote.status;
    const newStatus = filteredDto.status as any;
    
    // Check if transition is valid
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    
    // Throw error for invalid transition status
    if (!allowedTransitions?.includes(newStatus)) {
      errors.push(
        `Invalid status transition: ${currentStatus} → ${newStatus}`
      );
    }
  }

  // 3.3 Addresses validation
  if (filteredDto.addresses && filteredDto.addresses.length > 0) {
    for (const addrDto of filteredDto.addresses) {
      if (!addrDto.type || !["FROM", "TO"].includes(addrDto.type)) {
        errors.push("Address type must be FROM or TO");
        continue;
      }

      const addressType = addrDto.type;
      const existingAddress = existingQuote.addresses?.find(a => a.type === addressType);

      if (!existingAddress) {
        errors.push(`Address of type ${addressType} not found`);
        continue;
      }

      const hasManualFields = addrDto.address1 || addrDto.city || addrDto.state || 
                            addrDto.country || addrDto.postalCode;
      const sendingAddressBookId = addrDto.addressBookId !== undefined;

      // SCENARIO 1: Manual address exists (address present, no addressBookEntry)
      if (existingAddress.address && !existingAddress.addressBookEntry) {
        
        if (sendingAddressBookId) {
          // Switching manual → address book
          if (hasManualFields) {        
            errors.push(`Cannot provide both addressBookId and manual address fields for ${addressType}`);
          }
          // Valid: will switch to address book in service
        } 
        else if (hasManualFields) {
          // Partial update of manual address
          const fieldsToCheck = ['address1', 'address2', 'city', 'state', 'country', 'postalCode'];
          for (const field of fieldsToCheck) {
            const value = addrDto[field as keyof AddressDto];
            if (value === '') {
              errors.push(`${field} cannot be empty for ${addressType}`);
            }
          }
        }
        // No fields sent = no update
      }

      // SCENARIO 2: Address book entry exists (no manual address, addressBookEntry present)
      else if (!existingAddress.address && existingAddress.addressBookEntry) {
        
        if (sendingAddressBookId && !hasManualFields) {
          // Updating to new address book entry - valid
          // No validation needed
        }
        else if (sendingAddressBookId && hasManualFields) {
          // ERROR: Cannot send both
          errors.push(`Cannot provide both addressBookId and manual address fields for ${addressType}`);
        }
        else if (hasManualFields) {
          // Switching address book → manual: NEED ALL FIELDS
          errors.push(...validateAddress(addrDto as any, quoteType));
        }
        // No fields sent = no update
      }

      // SCENARIO 3: Neither exists (shouldn't happen, but handle defensively)
      else if (!existingAddress.address && !existingAddress.addressBookEntry) {
        // Creating new address - need all fields or addressBookId
        if (sendingAddressBookId) {
          // Valid: will create with address book
        } else if (hasManualFields) {
          // Need full validation for new manual address
          errors.push(...validateAddress(addrDto as any, quoteType));
        }
        // Nothing sent = error? or no-op?
      }

      // SPOT-specific validation
      if (quoteType === QuoteType.SPOT && addrDto.locationType !== undefined) {
        if (!addrDto.locationType) {
          errors.push(`locationType required for SPOT ${addressType} address`);
        }
      }
    }
  }

  // 3.4 Line items validation
  const lineItemShipments = [
    ShipmentType.PACKAGE, 
    ShipmentType.PALLET, 
    ShipmentType.COURIER_PAK
  ];

  if (filteredDto.lineItem && lineItemShipments.includes(shipmentType)) {
    
    // Validate line item type if sent
    if (filteredDto.lineItem.type && filteredDto.lineItem.type !== shipmentType) {
      errors.push(`Line item type must be ${shipmentType}`);
    }

    // Get allowed unit fields from rules (getRules returns unit-level rules)
    const unitRules = getUpdateRules(shipmentType);
    console.log("Unit Rules =>", unitRules)
    const allowedUnitFields = unitRules.map(rule => rule.field);
  
    // Validate units - only allow whitelisted fields
    if (filteredDto.lineItem.units && filteredDto.lineItem.units.length > 0) {
      
      filteredDto.lineItem.units.forEach((unit, idx) => {
        const unitPrefix = `Line Item Unit #${idx + 1}: `;

        // Get fields actually sent in this unit (excluding undefined)
        const sentFields = Object.keys(unit).filter(
          key => unit[key as keyof typeof unit] !== undefined
        );
        console.log(sentFields)
        // Check for unwanted fields
        for (const field of sentFields) {
          if (!allowedUnitFields.includes(field)) {
            errors.push(`${unitPrefix}${field} is not allowed for ${shipmentType}`);
          }
        }
      });
    }

    // Validate lineItem-level fields
    const allowedLineItemFields = getLineItemFields(shipmentType);
    const sentLineItemFields = Object.keys(filteredDto.lineItem).filter(
      key => {
        const value = filteredDto.lineItem![key as keyof LineItemDTO];
        return value !== undefined && key !== 'units';
      }
    );
    
    for (const field of sentLineItemFields) {
      if (!allowedLineItemFields.includes(field)) {
        errors.push(`lineItem.${field} is not allowed for ${shipmentType}`);
      }
    }
  }

  // 3.5 Signature validation
  if (lineItemShipments.includes(shipmentType) && shipmentType !== ShipmentType.PALLET) {
    if (filteredDto.signature !== undefined) {
      if (!filteredDto.signature) {
        errors.push("Signature selection is required for this shipment type");
      }
    }
  }

  // 3.6 Spot details validation
  if (quoteType === QuoteType.SPOT && filteredDto.spotDetails) {
    errors.push(...validateSpotDetails(filteredDto.spotDetails, shipmentType));

    const expectedSpotType = getExpectedSpotType(shipmentType);
    if (filteredDto.spotDetails.spotType && filteredDto.spotDetails.spotType !== expectedSpotType) {
      errors.push(`spotType must be ${expectedSpotType} for ${shipmentType}`);
    }

    const contact = filteredDto.spotDetails.spotContact;
    if (contact) {
      if (!contact.contactName) errors.push("spotContact.contactName is required");
      if (!contact.phoneNumber) errors.push("spotContact.phoneNumber is required");
      if (!contact.email) errors.push("spotContact.email is required");
      if (!contact.shipDate) errors.push("spotContact.shipDate is required");
      
      if (shipmentType === ShipmentType.TIME_CRITICAL && !contact.deliveryDate) {
        errors.push("spotContact.deliveryDate is required for TIME_CRITICAL");
      }
    }
  }

  // 3.7 Services validation
  if (filteredDto.services) {
    const requiredServices = getRequiredServices(shipmentType);
    for (const service of requiredServices) {
      if (filteredDto.services[service as keyof typeof filteredDto.services] === undefined) {
        errors.push(`services.${service} is required for ${shipmentType}`);
      }
    }
  }

  // 3.8 Insurance validation
  if (filteredDto.insurance) {
    if (INSURANCE_FORBIDDEN_SHIPMENTS.includes(shipmentType)) {
      errors.push(`Insurance not allowed for ${shipmentType} shipments`);
    }
    
    if (quoteType === QuoteType.SPOT) {
      errors.push("Insurance not allowed for SPOT quotes");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    filteredDto: errors.length === 0 ? filteredDto : undefined,
    removedFields: removedFields.length > 0 ? removedFields : undefined,
  };
}

// Helper functions
function getExpectedSpotType(shipmentType: ShipmentType): string {
  const map: Record<string, string> = {
    [ShipmentType.SPOT_FTL]: "FTL",
    [ShipmentType.SPOT_LTL]: "LTL",
    [ShipmentType.TIME_CRITICAL]: "TIME_CRITICAL",
  };
  return map[shipmentType];
}

function getRequiredServices(shipmentType: ShipmentType): string[] {
  const map: Record<string, string[]> = {
    [ShipmentType.PALLET]: ["limitedAccess", "appointmentDelivery", "thresholdDelivery", "thresholdPickup"],
    [ShipmentType.STANDARD_FTL]: ["looseFreight", "pallets"],
    [ShipmentType.SPOT_LTL]: ["inbound", "protectFromFreeze", "limitedAccess"],
  };
  return map[shipmentType] || [];
}