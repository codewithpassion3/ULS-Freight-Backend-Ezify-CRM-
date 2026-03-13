import { Body, Controller, Get, Patch, Post, Req, Session, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { RolesGuard } from "src/guards/roles.guard";
import { Role } from "src/decorators/role.decorator";
import { CreateProfileDTO } from "../dto/create-profile";
import type { Request } from "express";
import { ROLES } from "src/common/constants/roles";
import { FileInterceptor } from "@nestjs/platform-express";
import { UpdateProfileDTO } from "../dto/update-profile";
import { multerConfig } from "src/config/multer.config";
import { UpdatePasswordDTO } from "../dto/update-password";

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

    @UseGuards(SessionAuthGuard)
    @Patch("me")
    @UseInterceptors(FileInterceptor("profile_pic", multerConfig))
    async UpdateUser(
        @CurrentUser() userId: number,
        @Body() dto: UpdateProfileDTO,
        @UploadedFile() file?: Express.Multer.File
    ) {
        return this.userService.update(userId, dto, file);
    }

    @UseGuards(SessionAuthGuard)
    @Patch("/password")
    async UpdatePassword(@Body() dto: UpdatePasswordDTO, @CurrentUser() userId: number){
        return this.userService.updatePassword(dto, userId);
    }
}