import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { RolesGuard } from "src/guards/roles.guard";
import { Role } from "src/decorators/role.decorator";
import { CreateProfileDTO } from "../dto/create-profile";
import type { Request } from "express";
import { ROLES } from "src/common/constants/roles";

@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(SessionAuthGuard)
    @Get("/me")
    async GetProfile(@CurrentUser() userId: number ) {        
        const user = await this.userService.getProfile(userId);

        return {
            message: "Profile details fetched successfully",
            user
        }
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Post("/")
    async CreateProfile(@Body() dto: CreateProfileDTO, @Req() request: Request){
        const companyId = request.session.companyId as number;
        
        await this.userService.createProfile(dto, companyId);
        
        return {
            message: "Profile create successfully"
        }
    }
}