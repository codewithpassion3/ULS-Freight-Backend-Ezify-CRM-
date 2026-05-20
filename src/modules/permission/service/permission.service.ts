import { EntityManager } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { SessionData } from "express-session";
import { ADMIN_EXCLUDED_PERMISSIONS, STAFF_ALLOWED_PERMISSIONS } from "src/common/constants/permissions";
import { ROLES } from "src/common/constants/roles";
import { Permission } from "src/entities/permission.entity";

@Injectable()
export class PermissionService {
    constructor(private readonly em: EntityManager) {}

    async getAll(session: SessionData){
        let permissions = await this.em.findAll(Permission);

        if(session.role === ROLES.ADMIN) return permissions.filter(permission => !ADMIN_EXCLUDED_PERMISSIONS.includes(permission.name))
        
        if(session.role === ROLES.SUPER_ADMIN) return permissions.filter( permission => STAFF_ALLOWED_PERMISSIONS.includes(permission.name))
        
        return permissions;
    }
}

