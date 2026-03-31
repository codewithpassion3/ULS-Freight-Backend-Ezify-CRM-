import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { SpotType } from "src/common/enum/spot-type.enum";
import { validateAddress } from "./validateAddress";
import { validateSpotDetails } from "./validateSpotDetails";
import { CreateQuoteDTO } from "src/modules/quote/dto/create-quote.dto";
import { UpdateQuoteDTO } from "src/modules/quote/dto/update-quote.dto";
import { Quote } from "src/entities/quote.entity";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface FieldRule {
  field: string;
  required: boolean;
  condition?: (data: any) => boolean;
}

/* -------------------- Line Item Fields --------------*/
export function getLineItemFields(shipmentType: ShipmentType): string[] {
  const common = ['type', 'units'];
  
  switch (shipmentType) {
    case ShipmentType.PACKAGE:
      return [...common, 'measurementUnit', 'dangerousGoods', 'description'];
    case ShipmentType.PALLET:
      return [...common, 'measurementUnit', 'dangerousGoods', 'stackable', 'description'];
    case ShipmentType.COURIER_PAK:
      return [...common, 'measurementUnit', 'description'];
    default:
      return common;
  }
}
/* -------------------- RULES -------------------- */

const packageRules: FieldRule[] = [
  { field: 'length', required: true },
  { field: 'width', required: true },
  { field: 'height', required: true },
  { field: 'weight', required: true },
  { field: 'description', required: true },
  { field: 'specialHandlingRequired', required: true }
];

const palletRules: FieldRule[] = [
  { field: 'length', required: true },
  { field: 'width', required: true },
  { field: 'height', required: true },
  { field: 'weight', required: true },
  { field: 'freightClass', required: true },
  { field: 'nmfc', required: true },
  { field: 'stackable', required: false },
  { field: 'unitsOnPallet', required: true },
  { field: 'palletUnitType', required: true },
  { field: 'description', required: true },

];

const courierRules: FieldRule[] = [
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
      const prefix =
        context?.unitIndex !== undefined
          ? `Line Item Unit #${context.unitIndex + 1}: `
          : '';
      errors.push(`${prefix}${rule.field} is required`);
    }

    if (rule.condition && !rule.condition(data)) {
      const prefix =
        context?.unitIndex !== undefined
          ? `Line Item Unit #${context.unitIndex + 1}: `
          : '';
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
    case ShipmentType.COURIER_PAK:
      return courierRules;
    default:
      return [];
  }
}

/* -------------------- MAIN VALIDATOR -------------------- */

export function validateQuote(
  dto: CreateQuoteDTO | UpdateQuoteDTO,
  mode: 'create' | 'update',
  existing?: Quote
): ValidationResult {
  const errors: string[] = [];

  /* -------------------- EFFECTIVE STATE -------------------- */

  const effective =
    mode === 'update'
      ? { ...existing, ...dto }
      : dto;

  const shipmentType = effective.shipmentType as ShipmentType;
  const quoteType = effective.quoteType;

  /* -------------------- BASIC REQUIRED FIELDS -------------------- */

  if (mode === 'create') {
    if (!dto.shipmentType) errors.push('shipmentType is required');
    if (!dto.quoteType) errors.push('quoteType is required');
  }

  if (mode === 'update' && !existing) {
    throw new Error('Existing quote is required for update validation');
  }

  /* -------------------- QUOTE TYPE RULES -------------------- */

  const SPOT_TYPES = [
    ShipmentType.SPOT_FTL,
    ShipmentType.SPOT_LTL,
    ShipmentType.TIME_CRITICAL,
  ];

  if (quoteType === QuoteType.SPOT && !SPOT_TYPES.includes(shipmentType)) {
    errors.push('SPOT quote must use SPOT shipment types');
  }

  if (quoteType === QuoteType.STANDARD && SPOT_TYPES.includes(shipmentType)) {
    errors.push('STANDARD quote cannot use SPOT shipment types');
  }

  /* -------------------- SPOT DETAILS -------------------- */

  const SHIPMENT_TO_SPOT_TYPE_MAP = {
    [ShipmentType.TIME_CRITICAL]: SpotType.TIME_CRITICAL,
    [ShipmentType.SPOT_FTL]: SpotType.FTL,
    [ShipmentType.SPOT_LTL]: SpotType.LTL,
  };

  if (effective.spotDetails) {
    const expectedSpotType = SHIPMENT_TO_SPOT_TYPE_MAP[shipmentType];

    if (!expectedSpotType) {
      errors.push(`Unsupported shipmentType: ${shipmentType}`);
    } else if (effective.spotDetails.spotType !== expectedSpotType) {
      errors.push(
        `spotDetails.spotType must be ${expectedSpotType} for shipmentType ${shipmentType}`
      );
    }
  }

  /* -------------------- ADDRESS VALIDATION -------------------- */

 const normalizedAddresses = (effective.addresses ?? []).map((addr: any) => ({
  ...addr,
  locationType: addr.locationType ?? undefined,
}));

for (const address of normalizedAddresses) {
  errors.push(...validateAddress(address, quoteType as QuoteType));
}

  /* -------------------- SIGNATURE RULE -------------------- */

  const requiresSignature = [
    ShipmentType.PACKAGE,
    ShipmentType.COURIER_PAK,
  ].includes(shipmentType);

  if (requiresSignature && !effective.signature) {
    errors.push(`Signature is required for ${shipmentType}`);
  }

  if (quoteType === QuoteType.SPOT && effective.signature) {
    errors.push(`Signature not allowed for SPOT shipments`);
  }

  /* -------------------- LINE ITEM -------------------- */

  const requiresLineItem = [
    ShipmentType.PACKAGE,
    ShipmentType.PALLET,
    ShipmentType.COURIER_PAK,
  ].includes(shipmentType);

  const lineItem = effective.lineItem;

  if (requiresLineItem) {
    if (!lineItem) {
      errors.push(`Line item is required for ${shipmentType}`);
      return { valid: false, errors };
    }

    if (!lineItem.units?.length) {
      errors.push(`At least one unit is required for ${shipmentType}`);
    }

    if (lineItem.type !== shipmentType) {
      errors.push(
        `Line item type must match shipment type (${shipmentType})`
      );
    }
  }

  if (
    shipmentType === ShipmentType.STANDARD_FTL ||
    quoteType === QuoteType.SPOT
  ) {
    if (lineItem) {
      errors.push(`Line items not allowed for ${shipmentType}`);
    }
  }

  if (
    [ShipmentType.COURIER_PAK, ShipmentType.PACKAGE, ShipmentType.PALLET].includes(shipmentType) &&
    !lineItem?.measurementUnit
  ) {
    errors.push(`Line item requires measurementUnit`);
  }

  if (shipmentType === ShipmentType.PALLET && !lineItem?.stackable) {
    errors.push(`Pallet shipments require stackable field`);
  }

  if (
    [ShipmentType.PACKAGE, ShipmentType.PALLET].includes(shipmentType) &&
    lineItem?.dangerousGoods === undefined
  ) {
    errors.push(`dangerousGoods is required`);
  }

  /* -------------------- UNIT VALIDATION -------------------- */

  if (lineItem?.units?.length) {
    const rules = getRules(shipmentType);

    lineItem.units.forEach((unit: any, idx: number) => {
      const result = validateUnit(unit, rules, { unitIndex: idx });
      errors.push(...result.errors);
    });
  }

  /* -------------------- SPOT VALIDATION -------------------- */

  if (quoteType === QuoteType.SPOT) {
    errors.push(...validateSpotDetails(effective.spotDetails, shipmentType));
  }

  if (quoteType === QuoteType.SPOT && effective.insurance) {
    errors.push(`Insurance not allowed for SPOT shipments`);
  }

  /* -------------------- SERVICES -------------------- */

  const services = effective.services || {};

  const requiredServiceFields: Record<ShipmentType, string[]> = {
    [ShipmentType.PALLET]: [
      'limitedAccess',
      'appointmentDelivery',
      'thresholdDelivery',
      'thresholdPickup',
    ],
    [ShipmentType.STANDARD_FTL]: ['looseFreight', 'pallets'],
    [ShipmentType.SPOT_LTL]: ['inbound', 'protectFromFreeze', 'limitedAccess'],
    [ShipmentType.PACKAGE]: [],
    [ShipmentType.COURIER_PAK]: [],
    [ShipmentType.TIME_CRITICAL]: [],
    [ShipmentType.SPOT_FTL]: [],
  };

  const requiredFields = requiredServiceFields[shipmentType] || [];

  requiredFields.forEach(field => {
    if (services[field] === undefined) {
      errors.push(`${field} is required for ${shipmentType}`);
    }
  });

  Object.entries(services).forEach(([field, value]) => {
    if (typeof value !== 'boolean') {
      errors.push(`services.${field} must be boolean`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}