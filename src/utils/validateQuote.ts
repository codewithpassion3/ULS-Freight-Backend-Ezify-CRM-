import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { CreateQuoteDTO } from "src/modules/quote/dto/create-quote.dto";
import { validateAddress } from "./validateAddress";

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

type FieldRule = {
  field: string;
  required: boolean;
  condition?: (data: any) => boolean;
};

/* -------------------- RULES -------------------- */

const packageRules: FieldRule[] = [
  { field: 'quantity', required: true },
  { field: 'length', required: true },
  { field: 'width', required: true },
  { field: 'height', required: true },
  { field: 'weight', required: true },
  { field: 'description', required: true },
  { field: 'dangerousGoods', required: false },
];

const palletRules: FieldRule[] = [
  { field: 'quantity', required: true },
  { field: 'length', required: true },
  { field: 'width', required: true },
  { field: 'height', required: true },
  { field: 'weight', required: true },
  { field: 'freightClass', required: true },
  { field: 'nmfc', required: true },
  { field: 'stackable', required: false },
  { field: 'unitsOnPallet', required: true }
];

const courierRules: FieldRule[] = [
  { field: 'quantity', required: true },
  { field: 'weight', required: true },
  { field: 'description', required: true },
];

/* -------------------- UNIT VALIDATION -------------------- */

export function validateUnit(
  data: any,
  rules: FieldRule[],
  context?: { unitIndex?: number }
): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      const prefix = context?.unitIndex !== undefined ? `Line Item Unit #${context.unitIndex + 1}: ` : '';
      errors.push(`${prefix}${rule.field} is required`);
    }

    if (rule.condition && !rule.condition(data)) {
      const prefix = context?.unitIndex !== undefined ? `Line Item Unit #${context.unitIndex + 1}: ` : '';
      errors.push(`${prefix}${rule.field} failed conditional validation`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* -------------------- RULE SELECTOR -------------------- */

export function getRules(shipmentType: ShipmentType) {
  switch (shipmentType) {
    case ShipmentType.PACKAGE:
      return packageRules;
    case ShipmentType.PALLET:
      return palletRules;
    case ShipmentType.COURIER_PACK:
      return courierRules;
    default:
      return [];
  }
}

/* -------------------- MAIN VALIDATOR -------------------- */

export function validateQuote(dto: CreateQuoteDTO): ValidationResult {
  const errors: string[] = [];

  /* -------------------- ADDRESS VALIDATION -------------------- */
  for (const address of dto.addresses ?? []) {
    errors.push(...validateAddress(address));
  }

  /* -------------------- SIGNATURE RULE -------------------- */
  const requiresSignature = [
    ShipmentType.PACKAGE,
    ShipmentType.COURIER_PACK,
  ].includes(dto.shipmentType);

  if (requiresSignature && !dto.signature) {
    errors.push(`Signature is required for ${dto.shipmentType}`);
  }

  /* -------------------- LINE ITEM RULES -------------------- */

  const requiresLineItem = [
    ShipmentType.PACKAGE,
    ShipmentType.PALLET,
    ShipmentType.COURIER_PACK,
  ].includes(dto.shipmentType);

  // REQUIRED
  if (requiresLineItem) {
    if (!dto.lineItem) {
      errors.push(`Line item is required for ${dto.shipmentType}`);
      return { valid: false, errors };
    }

    if (!dto.lineItem.units?.length) {
      errors.push(`At least one unit is required for ${dto.shipmentType}`);
    }

    if (dto.lineItem.type !== dto.shipmentType) {
      errors.push(`Line item type (${dto.lineItem.type}) must match shipment type (${dto.shipmentType})`);
    }
  }

  // NOT ALLOWED
  if (dto.shipmentType === ShipmentType.FTL) {
    if (dto.lineItem) {
      errors.push(`Line items are not allowed for FTL shipments`);
    }
  }

  /* -------------------- UNIT VALIDATION -------------------- */

  if (dto.lineItem?.units?.length) {
    const rules = getRules(dto.shipmentType);

    dto.lineItem.units.forEach((unit, idx) => {
      const result = validateUnit(unit, rules, { unitIndex: idx });
      errors.push(...result.errors);
    });
  }

  /* -------------------- SERVICES VALIDATION -------------------- */
  const services = dto.services || {};

  // Map required services per shipment type
  const requiredServiceFields: Record<ShipmentType, string[]> = {
    [ShipmentType.PALLET]: ['limitedAccess', 'appointmentDelivery', 'thresholdDelivery', 'thresholdPickup'],
    [ShipmentType.FTL]: ['looseFreight', 'pallets'],
    [ShipmentType.LTL]: ['inbound', 'protectFromFreeze', 'limitedAccess'],
    [ShipmentType.PACKAGE]: [],
    [ShipmentType.COURIER_PACK]: [],
    [ShipmentType.TIME_CRITICAL]: [],
  };

  // Check required services
  const requiredFields = requiredServiceFields[dto.shipmentType] || [];
  requiredFields.forEach(field => {
    if (services[field] === undefined) {
      errors.push(`${field} is required for ${dto.shipmentType} shipments`);
    }
  });

  // Validate boolean fields
  Object.entries(services).forEach(([field, value]) => {
    if (typeof value !== 'boolean') {
      errors.push(`services field "${field}" must be boolean`);
    }
  });

    

  return {
    valid: errors.length === 0,
    errors,
  };
}