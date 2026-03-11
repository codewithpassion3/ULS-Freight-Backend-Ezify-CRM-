import { Module } from "@nestjs/common";
import { AuthController } from "./controller/auth.controller";
import { AuthService } from "./service/auth.service";
import { EmailModule } from "src/email/email.module";

@Module({
    imports: [EmailModule],
    controllers: [AuthController],
    providers: [AuthService]
})

export class AuthModule {};