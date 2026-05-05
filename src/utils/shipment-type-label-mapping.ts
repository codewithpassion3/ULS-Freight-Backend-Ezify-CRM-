import { ShipmentType } from "src/common/enum/shipment-type.enum";

export const ShipmentTypeLabel: Record<ShipmentType, string> = {
  [ShipmentType.PACKAGE]: 'Package',
  [ShipmentType.PALLET]: 'Pallet',
  [ShipmentType.COURIER_PAK]: 'Courier Pak',
  [ShipmentType.STANDARD_FTL]: 'Standard Full Truck Load (FTL)',
  [ShipmentType.SPOT_LTL]: 'Spot Less Than Truck Load (LTL)',
  [ShipmentType.SPOT_FTL]: 'Spot Full Truck Load (FTL)',
  [ShipmentType.TIME_CRITICAL]: 'Time Critical',
};