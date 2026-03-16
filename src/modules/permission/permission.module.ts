import { PermissionController } from "./controller/permission.controller";
import { PermissionService } from "./service/permission.service";
import { Module } from "@nestjs/common";

@Module({
    controllers: [PermissionController],
    providers: [PermissionService]
})

export class PermissionModule {}