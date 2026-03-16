import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Session, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { RolesGuard } from "src/guards/roles.guard";
import { Role } from "src/decorators/role.decorator";
import { CreateProfileDTO } from "../dto/create-profile.dto";
import type { Request } from "express";
import { ROLES } from "src/common/constants/roles";
import { FileInterceptor } from "@nestjs/platform-express";
import { UpdateProfileDTO } from "../dto/update-profile.dto";
import { multerConfig } from "src/config/multer.config";
import { UpdatePasswordDTO } from "../dto/update-password.dto";
import type { SessionData } from "express-session";
import { UpdateSettingsDto } from "../dto/user-settings-update.dto";

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
            message: "Profile created successfully"
        }
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Get("/")
    async GetAllProfiles(@CurrentUser() userId: number){
        return this.userService.getAllProfiles(userId);
    }


    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Delete("/:id")
    async DeleteProfile(@Session() session: SessionData, @Param("id") userId: number){
        const companyId = session.companyId;
        return this.userService.deleteProfile(companyId, userId);
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
    @Delete("/me/profile-pic")
    async DeleteUserProfile(@CurrentUser() userId: number){
        return this.userService.deleteProfilePic(userId);
    }

    @UseGuards(SessionAuthGuard)
    @Patch("/password")
    async UpdatePassword(@Body() dto: UpdatePasswordDTO, @CurrentUser() userId: number){
        return this.userService.updatePassword(dto, userId);
    }

    @UseGuards(SessionAuthGuard)
    @Post("/me/settings")
    async updateSettings(@CurrentUser() userId: number, @Body() dto: UpdateSettingsDto) {
        return this.userService.updateSettings(userId, dto);
    }
}