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
  resetUnallowed: boolean
): void {
  for (const field of ALL_UNIT_FIELDS) {
    if (allowedFields.has(field)) {
      // Only overwrite if the DTO actually provided a value
      if (unitDto[field] !== undefined) {
        (unit as any)[field] = unitDto[field];
      }
      // else: keep existing value (partial update)
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