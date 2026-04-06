import { ShipmentType } from "../enum/shipment-type.enum";

export type UnitField =
  | 'length' | 'width' | 'height' | 'weight'
  | 'description' | 'freightClass' | 'nmfc'
  | 'unitsOnPallet' | 'specialHandlingRequired' | 'palletUnitType';

const PACKAGE_FIELDS = new Set<UnitField>([
  'length', 'width', 'height', 'weight', 'description', 'specialHandlingRequired'
]);

const PALLET_FIELDS = new Set<UnitField>([
  'length', 'width', 'height', 'weight',
  'freightClass', 'nmfc', 'unitsOnPallet',
  'palletUnitType', 'description'
]);

const COURIER_FIELDS = new Set<UnitField>([
  'weight', 'description'
]);

const ALL_UNIT_FIELDS: UnitField[] = [
  'length', 'width', 'height', 'weight',
  'description', 'freightClass', 'nmfc',
  'unitsOnPallet', 'specialHandlingRequired', 'palletUnitType'
];

export function getAllowedFields(type: ShipmentType): Set<UnitField> {
  switch (type) {
    case ShipmentType.PACKAGE:     return PACKAGE_FIELDS;
    case ShipmentType.PALLET:      return PALLET_FIELDS;
    case ShipmentType.COURIER_PAK: return COURIER_FIELDS;
    default: return new Set();
  }
}

export { ALL_UNIT_FIELDS };