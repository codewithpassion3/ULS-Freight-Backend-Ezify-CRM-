import { EntityManager } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { Role } from "src/entities/role.entity";

@Injectable()
export class RoleService{
    constructor(private readonly em: EntityManager) {}

    async getAll(){
        const roles = await this.em.findAll(Role);
        return roles;
    }
}