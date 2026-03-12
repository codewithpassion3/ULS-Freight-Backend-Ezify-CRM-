import { Module } from "@nestjs/common";
import { RoleController } from "./controller/role.controller";
import { RoleService } from "./service/role.service";

@Module({
    controllers: [RoleController],
    providers: [RoleService]
})

export class RoleModule {}