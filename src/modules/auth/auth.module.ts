import { Module } from "@nestjs/common";
import { AuthController } from "./controller/auth.controller";
import { AuthService } from "./service/auth.service";
import { OtpModule } from "../otp/opt.module";

@Module({
    imports: [OtpModule],
    controllers: [AuthController],
    providers: [AuthService]
})

export class AuthModule {};