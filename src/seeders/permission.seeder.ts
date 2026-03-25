// src/seeders/permission.seeder.ts
import { EntityManager } from "@mikro-orm/core";
import { Permission } from "src/entities/permission.entity";
import { PermissionNames } from "src/common/constants/permissions";
import { seedEntities, SeedItem } from "./base-entity.seeder";

const permissionData: SeedItem<Permission>[] = PermissionNames.map(name => ({
  name,
  data: {}
}));

export async function seedPermissions(em: EntityManager): Promise<Map<string, Permission>> {
  return seedEntities(em, {
    entity: Permission,
    items: permissionData,
    findExisting: (em, names) => em.find(Permission, { name: { $in: names } })
  });
}