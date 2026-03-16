import { EntityManager } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { Permission } from "src/entities/permission.entity";

@Injectable()
export class PermissionService {
    constructor(private readonly em: EntityManager) {}

    async getAll(){
        const permissions = await this.em.findAll(Permission);
        return permissions;
    }
}

