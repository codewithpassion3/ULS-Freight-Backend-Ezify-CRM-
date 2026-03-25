import { EntityManager } from "@mikro-orm/core";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type.entity";
import { LocationType, LocationLabels } from "src/common/constants/location-type";
import { seedEntities, SeedItem } from "./base-entity.seeder";

const locationTypeData: SeedItem<PalletShippingLocationType>[] = [
  {
    name: LocationLabels[LocationType.BUSINESS_TAILGATE_NOT_REQUIRED],
    data: { locationType: LocationType.BUSINESS_TAILGATE_NOT_REQUIRED }
  },
  {
    name: LocationLabels[LocationType.BUSINESS_TAILGATE_REQUIRED],
    data: { locationType: LocationType.BUSINESS_TAILGATE_REQUIRED }
  },
  {
    name: LocationLabels[LocationType.RESIDENCE_TAILGATE_NOT_REQUIRED],
    data: { locationType: LocationType.RESIDENCE_TAILGATE_NOT_REQUIRED }
  },
  {
    name: LocationLabels[LocationType.RESIDENCE_TAILGATE_REQUIRED],
    data: { locationType: LocationType.RESIDENCE_TAILGATE_REQUIRED }
  }
];

export async function seedShipmentLocationTypes(em: EntityManager) {
  await seedEntities(em, {
    entity: PalletShippingLocationType,
    items: locationTypeData,
    findExisting: (em, names) => 
      em.find(PalletShippingLocationType, { name: { $in: names } })
  });
}