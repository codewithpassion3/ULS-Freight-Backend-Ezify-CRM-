import { ShipmentType } from "src/common/enum/shipment-type.enum";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { SpotType } from "src/common/enum/spot-type.enum";
import { validateAddress } from "./validateAddress";
import { validateSpotDetails } from "./validateSpotDetails";
import { CreateQuoteDTO } from "src/modules/quote/dto/create-quote.dto";
import { UpdateQuoteDTO } from "src/modules/quote/dto/update-quote.dto";
import { Quote } from "src/entities/quote.entity";
import { requiredServiceFields } from "src/common/constants/quote";
import { BondType, ContactKey, LimitedAccessType } from "src/common/enum/services.enum";
import { MeasurementUnits } from "src/common/enum/measurement-units.enum";
import { TRADE_SHOW_DELIVERY } from "src/common/enum/quote";

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
  { field: 'description', required: false },
  { field: 'specialHandlingRequired', required: false }
];

const palletRules: FieldRule[] = [
  { field: 'length', required: true },
  { field: 'width', required: true },
  { field: 'height', required: true },
  { field: 'weight', required: true },
  { field: 'freightClass', required: true },
  { field: 'nmfc', required: false },
  { field: 'stackable', required: false },
  { field: 'unitsOnPallet', required: false },
  { field: 'palletUnitType', required: false },
  { field: 'description', required: false },

];

const courierRules: FieldRule[] = [
  { field: 'weight', required: true },
  { field: 'description', required: false },
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
// validateQuote.ts
export function getUpdateRules(shipmentType: ShipmentType): FieldRule[] {
  return [
    ...getRules(shipmentType),          // spread existing creation rules
    { field: 'id', required: true }  // always required for update
  ];
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

 export const multiOptionFields = {
    IN_BOUND: {
      "key": "inbound",
      "value": {
        "bondType": [BondType.T_E_BOND, BondType.IT_BOND],
        "bondCancler": "",
        "address": "",
        "contactKey": [ContactKey.EMAIL, ContactKey.FAX_NUMBER, ContactKey.PHONE],
        "contactValue": ""
      }
    },
    LIMITED_ACCESS: {
      "key": "limitedAccess",
      "value": [
        LimitedAccessType.OTHERS,
        LimitedAccessType.AMUSEMENT_PARK,
        LimitedAccessType.CONSTRUCTION_SITE,
        LimitedAccessType.FARM_COUNTRY_CLUB_ESTATE,
        LimitedAccessType.GROCERY_RETAIL_LOCATIONS,
        LimitedAccessType.INDIVIDUAL_STORAGE_UNIT,
        LimitedAccessType.SCHOOL_UNIVERSITY,
        LimitedAccessType.SECURED_LOCATIONS_DELIVERY,
        LimitedAccessType.PLACE_OF_WORSHIP,
        LimitedAccessType.PLAZA_MALL_OR_STORES_WITH_PARKING_LOT_STREET_ACCESS
      ],
      "description": ""
    },
    LOOSE_FREIGHT: {
      key: "looseFreight",
      value: {
        pieceCount: { required: false },
        totalWeight: { required: true },
        measurementUnit: {
          required: true,
          enum: [MeasurementUnits.IMPERIAL, MeasurementUnits.METRIC]
        },
        message: { required: false }
      }
    },
    PALLET: {
      key: "pallet",
      value: {
        pieceCount: { required: false },
        totalWeight: { required: true },
        measurementUnit: {
          required: true,
          enum: [MeasurementUnits.IMPERIAL, MeasurementUnits.METRIC]
        },
        message: { required: false }
      },
      TRADE_SHOW_DELIVERY: {
        key: "tradeShowDelivery",
        value: {
          isBeingCheckedInStandardQuote: { required: false },
          appointmentDeliveryRequired: { required: false },
          deliveryTo: {
            require: true,
            enum: [TRADE_SHOW_DELIVERY.ADVANCE_WAREHOUSE, TRADE_SHOW_DELIVERY.TRADE_SHOW]
          },
          moveInDate: { required: true },
          tradeShowName: { required: true },
          tradeShowBooth: { required: true },
          contactName: { required: true },
          contactNumber: { required: true },
          generalInstructions: { required: true }
        }
      },
      AMAZON_OR_FBA_DELIVERY: {
        key: "amazonOrFbaDelivery",
        value: {
          isBeingCheckedInStandardQuote: { reqiored: false },
          appointmentScheduledAlready: { required: true },
          appointmentDate: { required: false },
          appointmentTime: { required: false }, 
          fba: { required: true },
          orderId: { required: true }
        }
      },
      GROCERY_DISTRIBUTOR_CENTER: {
        key: "groceryDistributorCenter",
        value: {
          facilityName: { required: true },
          orderId: { required: false },
          hasAppointmentAlreadyBeenScheduled: { required: true },
          appointmentDate: { required: false },
          appointmentTime: { required: false }, 
          appointmentConfirmation: { required: false },
          appointmentPortal: { required: false },
          additionalRemarks: { required: false }
        }
    }
    }
  }

  function validateWeightBasedField({localErrors, data, fieldName }: {localErrors: string[], data: any, fieldName: string}) {
  if (!data) {
    localErrors.push(`${fieldName} must be an object`);
  }

  // required fields
  if (data.totalWeight == null) {
    localErrors.push(`${fieldName}.totalWeight is required`);
  }

  if (!data.measurementUnit) {
    localErrors.push(`${fieldName}.measurementUnit is required`);
  }

  if (
    ![MeasurementUnits.METRIC, MeasurementUnits.IMPERIAL].includes(data.measurementUnit)
  ) {
    localErrors.push(`${fieldName}.measurementUnit must in (${MeasurementUnits.METRIC}, ${MeasurementUnits.IMPERIAL})`);
  }

  // optional sanity check (no strict failure)
  if (data.totalCount != null && typeof data.totalCount !== "number") {
     localErrors.push(`${fieldName}.count must be a number`);
  }

  return true;
}
  export const validateServicesAgainstQuote = (dtoServices: Record<string, any>, shipmentType: ShipmentType) => {
   
    const requiredFields = requiredServiceFields[shipmentType];
    let localErrors = [] as string[];

    if(typeof dtoServices !== "object"){
      localErrors.push("services must be an object")
    }

    if(requiredFields.length > 0){
      Object.entries(dtoServices).forEach(([field, value]) => {
        if (requiredFields[field] && value === undefined) {
          localErrors.push(`${field} does not belongs to ${shipmentType}`);
        }
      });

      Object.entries(dtoServices).forEach(([field, value]) => {
        if (field === multiOptionFields.LIMITED_ACCESS.key && value === LimitedAccessType.OTHERS && !value?.limitedAccessDescription){
          localErrors.push(`services.${field} must provide limitedAccessDescription field when selected others option`);
        }

        if (field === multiOptionFields.LIMITED_ACCESS.key && !LimitedAccessType[value]) {
          localErrors.push(
            `services.${field} has invalid value. Allowed values are: ${multiOptionFields.LIMITED_ACCESS.value.join(",")}`
          );
        }


        if (field === multiOptionFields.IN_BOUND.key && typeof value !== "object") {
          localErrors.push(`services.${field} must be an object`);
        }

        if (field === multiOptionFields.IN_BOUND.key) {
            const {
              bondType,
              bondCancler,
              contactKey,
              contactValue,
              address,
            } = value;

      
         if (typeof bondType !== "string" || !bondType.trim()) {
              localErrors.push(
                `services.${field}.bondType must be a non-empty string`
              );
            }

            if (typeof bondCancler !== "string" || !bondCancler.trim()) {
              localErrors.push(
                `services.${field}.bondCancler must be a non-empty string`
              );
            }

            if (typeof contactKey !== "string" || !contactKey.trim()) {
              localErrors.push(
                `services.${field}.contactKey must be a non-empty string`
              );
            }

            if (typeof contactValue !== "string" || !contactValue.trim()) {
              localErrors.push(
                `services.${field}.contactValue must be a non-empty string`
              );
            }

            if (typeof address !== "string" || !address.trim()) {
              localErrors.push(
                `services.${field}.address must be a non-empty string`
              );
            }

              const invalidBondTypes =  !BondType[bondType]
              if (invalidBondTypes) {
                localErrors.push(
                  `services.${field}.bondType has invalid value: ${bondType}. Allowed values: ${multiOptionFields.IN_BOUND.value.bondType.join(", ")}`
                );
              }

     
              const invalidContactKey = !ContactKey[contactKey];
              if (invalidContactKey) {
                localErrors.push(
                  `services.${field}.contactKey has invalid value: ${contactKey}. Allowed values: ${multiOptionFields.IN_BOUND.value.contactKey.join(", ")}`
                );
              }
        }

        const WEIGHT_BASED_FIELDS = new Set([
          multiOptionFields.LOOSE_FREIGHT.key,
          multiOptionFields.PALLET.key
        ]);

        if (WEIGHT_BASED_FIELDS.has(field)) {
          validateWeightBasedField({localErrors, data: value, fieldName: field});
        }
      });
    }

    return localErrors;
  }


export const validateAndFilterServicesForUpdate = (
    dtoServices: Record<string, any> | undefined,
    shipmentType: ShipmentType
): { errors: string[]; validServices: Record<string, any> } => {

    const errors: string[] = [];

    const requiredFields = requiredServiceFields[shipmentType] || [];

    if (!dtoServices || typeof dtoServices !== "object" || Array.isArray(dtoServices)) {
        return {
            errors: ["services must be an object"],
            validServices: {},
        };
    }

    const validServices: Record<string, any> = {};

    for (const [field, value] of Object.entries(dtoServices)) {

        if (!requiredFields.includes(field)) continue;
        console.log("FROM VALIDARTION", field, value)

        if (field === multiOptionFields.LIMITED_ACCESS.key) {
            if (typeof value !== "string") {
                errors.push(`services.${field} must be a string`);
                continue;
            }

            if (!Object.values(LimitedAccessType).includes(value as LimitedAccessType)) {
                errors.push(
                    `services.${field} has invalid value. Allowed values: ${Object.values(LimitedAccessType).join(", ")}`
                );
                continue;
            }

            validServices[field] = value;

            // -----------------------------
            // handle dependent field
            // -----------------------------
            if (value === LimitedAccessType.OTHERS) {
                const desc = dtoServices.limitedAccessDescription;

                if (desc !== undefined) {
                    if (typeof desc !== "string" || !desc.trim()) {
                        errors.push(`services.limitedAccessDescription must be a non-empty string`);
                    } else {
                        validServices.limitedAccessDescription = desc.trim();
                    }
                }
            }

            continue;
        }
        
        // -----------------------------
        // OBJECT SERVICES
        // -----------------------------
        if (
            field === multiOptionFields.IN_BOUND.key
        ) {
            if (value === null || typeof value !== "object") {
                continue; // ignore invalid object shape
            }

            validServices[field] = value;
            continue;
        }

         // ─── TRADE_SHOW_DELIVERY ───────────────────────────────────────────────────
      if (field === multiOptionFields.PALLET.TRADE_SHOW_DELIVERY.key) {
        if (typeof value !== "object") {
          errors.push(`services.${field} must be an object`);
        } else {
          const {
            deliveryTo,
            moveInDate,
            tradeShowName,
            tradeShowBooth,
            contactName,
            contactNumber,
            generalInstructions,
          } = value;

         if (!deliveryTo || !Object.values(TRADE_SHOW_DELIVERY).includes(deliveryTo)) {
            errors.push(
              `services.${field}.deliveryTo has invalid value. Allowed values are: ${Object.values(TRADE_SHOW_DELIVERY).join(", ")}`
            );
          }

          if (typeof moveInDate !== "string" || !moveInDate.trim()) {
            errors.push(`services.${field}.moveInDate must be a non-empty string`);
          }

          if (typeof tradeShowName !== "string" || !tradeShowName.trim()) {
            errors.push(`services.${field}.tradeShowName must be a non-empty string`);
          }

          if (typeof tradeShowBooth !== "string" || !tradeShowBooth.trim()) {
            errors.push(`services.${field}.tradeShowBooth must be a non-empty string`);
          }

          if (typeof contactName !== "string" || !contactName.trim()) {
            errors.push(`services.${field}.contactName must be a non-empty string`);
          }

          if (typeof contactNumber !== "string" || !contactNumber.trim()) {
            errors.push(`services.${field}.contactNumber must be a non-empty string`);
          }

          if (typeof generalInstructions !== "string" || !generalInstructions.trim()) {
            errors.push(`services.${field}.generalInstructions must be a non-empty string`);
          }
        }
      }

      // ─── AMAZON_OR_FBA_DELIVERY ────────────────────────────────────────────────
      if (field === multiOptionFields.PALLET.AMAZON_OR_FBA_DELIVERY.key) {
        if (typeof value !== "object") {
          errors.push(`services.${field} must be an object`);
        } else {
          const {
            appointmentScheduledAlready,
            appointmentDate,
            appointmentTime,
            fba,
            orderId,
          } = value;

          if (typeof fba !== "string" || !fba.trim()) {
            errors.push(`services.${field}.fba must be a non-empty string`);
          }

          if (typeof orderId !== "string" || !orderId.trim()) {
            errors.push(`services.${field}.orderId must be a non-empty string`);
          }

          if (appointmentScheduledAlready === true) {
            if (typeof appointmentDate !== "string" || !appointmentDate.trim()) {
              errors.push(
                `services.${field}.appointmentDate must be a non-empty string when appointmentScheduledAlready is true`
              );
            }

            if (typeof appointmentTime !== "string" || !appointmentTime.trim()) {
              errors.push(
                `services.${field}.appointmentTime must be a non-empty string when appointmentScheduledAlready is true`
              );
            }
          }
        }
      }

      // ─── GROCERY_DISTRIBUTOR_CENTER ────────────────────────────────────────────
      if (field === multiOptionFields.PALLET.GROCERY_DISTRIBUTOR_CENTER.key) {
        if (typeof value !== "object") {
          errors.push(`services.${field} must be an object`);
        } else {
          const {
            facilityName,
            hasAppointmentAlreadyBeenScheduled,
            appointmentDate,
            appointmentTime,
            appointmentConfirmation,
          } = value;

          if (typeof facilityName !== "string" || !facilityName.trim()) {
            errors.push(`services.${field}.facilityName must be a non-empty string`);
          }

          if (hasAppointmentAlreadyBeenScheduled === true) {
            if (typeof appointmentDate !== "string" || !appointmentDate.trim()) {
              errors.push(
                `services.${field}.appointmentDate must be a non-empty string when hasAppointmentAlreadyBeenScheduled is true`
              );
            }

            if (typeof appointmentTime !== "string" || !appointmentTime.trim()) {
              errors.push(
                `services.${field}.appointmentTime must be a non-empty string when hasAppointmentAlreadyBeenScheduled is true`
              );
            }

            if (typeof appointmentConfirmation !== "string" || !appointmentConfirmation.trim()) {
              errors.push(
                `services.${field}.appointmentConfirmation must be a non-empty string when hasAppointmentAlreadyBeenScheduled is true`
              );
            }
          }
        }
      }

        if (typeof value !== "boolean") {
            errors.push(`services.${field} must be boolean`);
            continue;
        }

        validServices[field] = value;
    }

    return {
        errors,
        validServices,
    };
};