// src/modules/quote/utils/filter-update-fields.ts

import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { 
  UPDATE_WHITELIST, 
  NESTED_UPDATE_WHITELIST,
  IMMUTABLE_FIELDS 
} from "../common/constants/quote";

/**
 * Deep filters an object to only include whitelisted fields
 */
export function filterUpdateFields(
  dto: Record<string, any>,
  shipmentType: ShipmentType
): Record<string, any> {
  const allowedFields = UPDATE_WHITELIST[shipmentType];
  
  if (!allowedFields) {
    throw new Error(`No update whitelist defined for shipment type: ${shipmentType}`);
  }

  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(dto)) {
    // Skip immutable fields entirely
    if (IMMUTABLE_FIELDS.includes(key)) {
      continue;
    }

    // Only include whitelisted fields
    if (!allowedFields.includes(key)) {
      continue;
    }

    // Handle nested objects
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nestedWhitelist = NESTED_UPDATE_WHITELIST[key];
      if (nestedWhitelist) {
        filtered[key] = filterNestedObject(value, nestedWhitelist, key);
      } else {
        filtered[key] = value; // No nested restrictions
      }
    }
    // Handle arrays (addresses, units)
    else if (Array.isArray(value)) {
      const itemWhitelist = NESTED_UPDATE_WHITELIST[key];
      if (itemWhitelist && value.length > 0 && typeof value[0] === "object") {
        filtered[key] = value.map(item => 
          filterNestedObject(item, itemWhitelist, key)
        );
      } else {
        filtered[key] = value;
      }
    }
    else {
      filtered[key] = value;
    }
  }

  return filtered;
}

function filterNestedObject(
  obj: Record<string, any>,
  allowedFields: string[],
  path: string
): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!allowedFields.includes(key)) {
      continue;
    }

    // Check for deeper nesting (e.g., lineItem.units, spotDetails.spotContact)
    const nestedPath = `${path}.${key}`;
    const deeperWhitelist = NESTED_UPDATE_WHITELIST[nestedPath];

    if (deeperWhitelist && value !== null && typeof value === "object") {
      if (Array.isArray(value)) {
        filtered[key] = value.map(item => 
          filterNestedObject(item, deeperWhitelist, nestedPath)
        );
      } else {
        filtered[key] = filterNestedObject(value, deeperWhitelist, nestedPath);
      }
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}