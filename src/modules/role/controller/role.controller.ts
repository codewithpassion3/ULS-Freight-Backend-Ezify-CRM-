import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role } from "src/decorators/role.decorator";
import { RolesGuard } from "src/guards/roles.guard";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { ROLES } from "src/common/constants/roles";
import { RoleService } from "../service/role.service";

@Controller("roles")
export class RoleController{
    constructor(private readonly roleService: RoleService) {}

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Get("/")
    async getAll(){
        return this.roleService.getAll();
    }
}
