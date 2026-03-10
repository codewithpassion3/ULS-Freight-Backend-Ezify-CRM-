import { Controller, Get } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { CurrentUser } from "src/decorators/currentUser.decorator";

@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get("/me")
    async GetProfile(@CurrentUser() userId: number ) {        
        const user = await this.userService.getProfile(userId);

        return {
            message: "Profile details fetched successfully",
            user
        }
    }
}