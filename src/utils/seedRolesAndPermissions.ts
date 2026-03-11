import { EntityManager } from "@mikro-orm/core";
import { Permission } from "src/entities/permission.entity";
import { Role } from "src/entities/role.entity";

export async function seedRolesAndPermissions(em: EntityManager) {

  await em.transactional(async (em) => {
    const permissionNames = ["shipping", "invoicing", "claims"];
    const roleNames = ["admin", "user"];

    // Permissions
    const existingPermissions = await em.find(Permission, {
      name: { $in: permissionNames },
    });

    const permissionMap = new Map(
      existingPermissions.map(p => [p.name, p])
    );

    const missingPermissions: Permission[] = [];

    for (const name of permissionNames) {
      if (!permissionMap.has(name)) {
        const permission = em.create(Permission, { name });
        missingPermissions.push(permission);
        permissionMap.set(name, permission);
      }
    }

    if (missingPermissions.length) {
      em.persist(missingPermissions);
    }

    // Roles
    const existingRoles = await em.find(Role, {
      name: { $in: roleNames },
    });

    const roleMap = new Map(
      existingRoles.map(r => [r.name, r])
    );

    const missingRoles: Role[] = [];

    for (const name of roleNames) {
      if (!roleMap.has(name)) {
        const role = em.create(Role, { name });
        missingRoles.push(role);
        roleMap.set(name, role);
      }
    }

    if (missingRoles.length) {
      em.persist(missingRoles);
    }

   // Role Permission
    const permissions = Array.from(permissionMap.values());

    const adminRole = roleMap.get("admin")!;
    
    //Admin have all permissions
    adminRole.permissions.set(permissions);
  });
}