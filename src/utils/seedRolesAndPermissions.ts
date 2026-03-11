import { EntityManager } from "@mikro-orm/core";
import { Permission } from "src/entities/permission.entity";
import { Role } from "src/entities/role.entity";
import { PermissionNames } from "src/common/constants/permissions";
import { RoleNames, ROLES } from "src/common/constants/roles";

export async function seedRolesAndPermissions(em: EntityManager) {

  await em.transactional(async (em) => {
   

    // Permissions
    const existingPermissions = await em.find(Permission, {
      name: { $in: PermissionNames },
    });

    const permissionMap = new Map(
      existingPermissions.map(p => [p.name, p])
    );

    const missingPermissions: Permission[] = [];

    for (const name of PermissionNames) {
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
      name: { $in: RoleNames },
    });

    const roleMap = new Map(
      existingRoles.map(r => [r.name, r])
    );

    const missingRoles: Role[] = [];

    for (const name of RoleNames) {
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

    const adminRole = roleMap.get(ROLES.ADMIN)!;
    
    //Admin have all permissions
    adminRole.permissions.set(permissions);
  });
}