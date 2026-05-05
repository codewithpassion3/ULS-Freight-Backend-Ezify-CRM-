import { ShipmentType } from "../enum/shipment-type.enum";
import { SpotType } from "../enum/spot-type.enum";

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
  [SpotType.FTL]: [
    'dryVan',
    'refrigerated',
    'flatbed',
    'ventilated',
  ],
  [SpotType.LTL]: [
    'dryVan',
    'refrigerated',
  ]
};