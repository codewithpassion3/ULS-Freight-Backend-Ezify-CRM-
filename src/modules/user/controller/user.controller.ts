import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";

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
}