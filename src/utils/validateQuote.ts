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
];

const courierRules: FieldRule[] = [
  { field: 'quantity', required: true },
  { field: 'weight', required: true },
  { field: 'description', required: true },
];

/* -------------------- UNIT VALIDATION -------------------- */

export function validateUnit(data: any, rules: FieldRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];

    if (rule.required) {
      if (value === undefined || value === null || value === '') {
        errors.push(`${rule.field} is required`);
      }
    }

    if (rule.condition && !rule.condition(data)) {
      errors.push(`${rule.field} failed conditional validation`);
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

    for (const unit of dto.lineItem.units) {
      const result = validateUnit(unit, rules);
      errors.push(...result.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}