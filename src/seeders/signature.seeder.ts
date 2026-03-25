import { EntityManager } from "@mikro-orm/core";
import { Signature } from "src/entities/signature.entity";
import { SignatureType, SignatureLabels } from "src/common/constants/signature";
import { seedEntities } from "./base-entity.seeder";

const signatureData = [
  {
    name: SignatureLabels[SignatureType.NONE],
    data: { type: SignatureType.NONE }
  },
  {
    name: SignatureLabels[SignatureType.REQUIRED],
    data: { type: SignatureType.REQUIRED }
  },
  {
    name: SignatureLabels[SignatureType.ADULT_REQUIRED],
    data: { type: SignatureType.ADULT_REQUIRED }
  }
];

export async function seedSignatures(em: EntityManager) {
  await seedEntities(em, {
    entity: Signature,
    items: signatureData,
    findExisting: (em, names) => 
      em.find(Signature, { name: { $in: names } })
  });
}