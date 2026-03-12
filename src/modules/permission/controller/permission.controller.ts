import { Controller, Get, UseGuards } from "@nestjs/common";
import { PermissionService } from "../service/permission.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { RolesGuard } from "src/guards/roles.guard";
import { Role } from "src/decorators/role.decorator";
import { ROLES } from "src/common/constants/roles";

@Controller("permissions")
export class PermissionController {
    constructor(private readonly permissionService: PermissionService) {}

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Get("/")
    async getAll(){
        return this.permissionService.getAll();
    }
}