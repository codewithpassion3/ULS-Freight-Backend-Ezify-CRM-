import { ShipmentType } from "../enum/shipment-type.enum";

export const EQUIPMENT_RULES = {
  [ShipmentType.TIME_CRITICAL]: [
    'truck',
    'car',
    'van',
    'nextFlightOut',
  ],
  [ShipmentType.SPOT_FTL]: [
    'dryVan',
    'refrigerated',
    'flatbed',
    'ventilated',
  ],
  [ShipmentType.SPOT_LTL]: [
    'dryVan',
    'refrigerated',
  ],
};