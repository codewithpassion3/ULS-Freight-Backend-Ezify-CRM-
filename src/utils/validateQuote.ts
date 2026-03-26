import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { CreateQuoteDTO } from "src/modules/quote/dto/create-quote.dto";
import { validateAddress } from "./validateAddress";
import { validateSpotDetails } from "./validateSpotDetails";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { SpotType } from "src/common/enum/spot-type.enum";

interface ValidationResult {
  valid: boolean;
  errors: string[];
};

interface FieldRule {
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
  { field: 'specialHandlingRequired', required: true}
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
  { field: 'unitsOnPallet', required: true },
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

  const SPOT_TYPES = [
    ShipmentType.SPOT_FTL,
    ShipmentType.SPOT_LTL,
    ShipmentType.TIME_CRITICAL,
  ];

  if (dto.quoteType === QuoteType.SPOT && !SPOT_TYPES.includes(dto.shipmentType)) {
    errors.push('SPOT quote cannot use SPOT shipment types only');
  }

  if (dto.quoteType === QuoteType.STANDARD && SPOT_TYPES.includes(dto.shipmentType)) {
    errors.push("STANDARD quote cannot use SPOT shipment types");
  }

  const SHIPMENT_TO_SPOT_TYPE_MAP = {
    [ShipmentType.TIME_CRITICAL]: SpotType.TIME_CRITICAL,
    [ShipmentType.SPOT_FTL]: SpotType.FTL,
    [ShipmentType.SPOT_LTL]: SpotType.LTL,
  };

  if (dto.spotDetails) {
    const expectedSpotType = SHIPMENT_TO_SPOT_TYPE_MAP[dto.shipmentType as ShipmentType];

    if (!expectedSpotType) {
      errors.push(`Unsupported shipmentType: ${dto.shipmentType}`);
    } else if (dto.spotDetails.spotType !== expectedSpotType) {
      errors.push(
        `spotDetails.spotType must be ${expectedSpotType} for shipmentType ${dto.shipmentType}`
      );
    }
  }

  /* -------------------- ADDRESS VALIDATION -------------------- */
  for (const address of dto.addresses ?? []) {
    errors.push(...validateAddress(address, dto.quoteType));
  }

  /* -------------------- SIGNATURE RULE -------------------- */
  const requiresSignature = [
    ShipmentType.PACKAGE,
    ShipmentType.COURIER_PACK,
  ].includes(dto.shipmentType);

  if (requiresSignature && !dto.signature) {
    errors.push(`Signature is required for ${dto.shipmentType}`);
  }

  if (dto.quoteType === QuoteType.SPOT && dto.signature) {
    errors.push(`Signatures are not allowed for spot shipments`);
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
  if (dto.shipmentType === ShipmentType.STANDARD_FTL || dto.quoteType === QuoteType.SPOT) {
    if (dto.lineItem) {
      errors.push(`Line items are not allowed for ${dto.shipmentType} shipments`);
    }
  }

  if(dto.shipmentType === ShipmentType.PALLET && !dto.lineItem?.description){
        errors.push(`Line items for type ${dto.shipmentType} is missing description field`)
  }

  if([ShipmentType.COURIER_PACK, ShipmentType.PACKAGE, ShipmentType.PALLET].includes(dto.shipmentType) && !dto.lineItem?.measurementUnit){
      errors.push(`Line items for type ${dto.shipmentType} is missing measurementUnit field`)
  }

  if(dto.shipmentType === ShipmentType.PALLET && !dto.lineItem?.stackable){
      errors.push(`Line items for type ${dto.shipmentType} is missing stackable field`)
  }

  if((dto.shipmentType === ShipmentType.PACKAGE || dto.shipmentType === ShipmentType.PALLET) && dto.lineItem?.dangerousGoods === undefined){
      errors.push(`Line items for type ${dto.shipmentType} is missing dangerousGoods field`)
  }


  /* -------------------- UNIT VALIDATION -------------------- */

  if (dto.lineItem?.units?.length) {
    const rules = getRules(dto.shipmentType);

    dto.lineItem.units.forEach((unit, idx) => {
      const result = validateUnit(unit, rules, { unitIndex: idx });
      errors.push(...result.errors);
    });
  }

  /* -------------------- SPOT DETAILS VALIDATION -------------------- */

  if (dto.quoteType === QuoteType.SPOT) {
    errors.push(...validateSpotDetails(dto.spotDetails, dto.shipmentType));
  }

  if (dto.quoteType === QuoteType.SPOT && dto.insurance) {
    errors.push(`Insurance is not allowed for ${dto.quoteType} shipments`);
  }

  /* -------------------- SERVICES VALIDATION -------------------- */
  const services = dto.services || {};

  // Map required services per shipment type
  const requiredServiceFields: Record<ShipmentType, string[]> = {
    [ShipmentType.PALLET]: ['limitedAccess', 'appointmentDelivery', 'thresholdDelivery', 'thresholdPickup'],
    [ShipmentType.STANDARD_FTL]: ['looseFreight', 'pallets'],
    [ShipmentType.SPOT_LTL]: ['inbound', 'protectFromFreeze', 'limitedAccess'],
    [ShipmentType.PACKAGE]: [],
    [ShipmentType.COURIER_PACK]: [],
    [ShipmentType.TIME_CRITICAL]: [],
    [ShipmentType.SPOT_FTL]: []
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