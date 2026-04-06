import { BadRequestException } from "@nestjs/common";
import { UnitField, ALL_UNIT_FIELDS } from "src/common/constants/line-item-rules";
import { LineItemUnit } from "src/entities/line-item-unit.entity";

/**
 * Applies unitDto fields onto unit.
 * Only touches fields that are allowed for the current type.
 * If resetUnallowed=true, fields NOT in allowedFields are explicitly set to null.
 */
export function patchUnit(
  unit: LineItemUnit,
  unitDto: Partial<LineItemUnit>,
  allowedFields: Set<UnitField>,
  options: {
    resetUnallowed?: boolean;
    isCreate?: boolean;
    context?: {
      index?: number;
      id?: number;
    };
  } = {}
): void {
  const {
    resetUnallowed = false,
    isCreate = false,
    context,
  } = options;

  const unitLabel = context?.id
    ? `Unit ID ${context.id}`
    : `Unit #${(context?.index ?? 0) + 1}`;

  for (const field of ALL_UNIT_FIELDS) {
    if (allowedFields.has(field)) {
      if (unitDto[field] !== undefined) {
        (unit as any)[field] = unitDto[field];
      } else if (isCreate) {
        throw new BadRequestException(
          `${unitLabel}: Missing required field '${field}'`
        );
      }
    } else if (resetUnallowed) {
      (unit as any)[field] = null;
    }
  }
}

/**
 * Wipes all unit fields to null before applying a new type's rules.
 */
export function resetUnit(unit: LineItemUnit): void {
  for (const field of ALL_UNIT_FIELDS) {
    (unit as any)[field] = null;
  }
}