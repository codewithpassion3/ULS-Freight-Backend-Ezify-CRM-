// src/seeders/role.seeder.ts
import { EntityManager } from "@mikro-orm/core";
import { Role } from "src/entities/role.entity";
import { Permission } from "src/entities/permission.entity";
import { RoleNames, ROLES } from "src/common/constants/roles";
import { seedEntities, SeedItem } from "./base-entity.seeder";

const roleData: SeedItem<Role>[] = RoleNames.map(name => ({
  name,
  data: {}
}));

export async function seedRoles(
  em: EntityManager, 
  permissionMap: Map<string, Permission>
): Promise<void> {
  await seedEntities(em, {
    entity: Role,
    items: roleData,
    findExisting: (em, names) => em.find(Role, { name: { $in: names } }),
    
    // Hook to assign permissions after roles are created/found
    afterCreate: async (em, roleMap) => {
      const adminRole = roleMap.get(ROLES.ADMIN);
      if (adminRole) {
        const allPermissions = Array.from(permissionMap.values());
        adminRole.permissions.set(allPermissions);
      }
    }
  });
}