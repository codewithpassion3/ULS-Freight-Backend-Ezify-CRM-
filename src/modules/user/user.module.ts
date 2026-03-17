import { Module } from "@nestjs/common";
import { UserController } from "./controller/user.controller";
import { UserService } from "./service/user.service";
import { EmailModule } from "src/email/email.module";

@Module({
    imports: [EmailModule],
    controllers: [UserController],
    providers: [UserService]
})

export class UserModule {};