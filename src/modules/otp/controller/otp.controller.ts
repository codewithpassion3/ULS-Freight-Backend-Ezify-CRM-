import { Body, Controller, Post } from "@nestjs/common";
import { GenerateOtpDTO } from "../dto/generate-otp.dto";
import { VerifyOtpDTO } from "../dto/verify-otp.dto";
import { OtpService } from "../service/otp.service";

@Controller("otp")
export class OtpController {
    constructor(private readonly otpService: OtpService) {}
    
    @Post("/generate")
    async generate(@Body() dto: GenerateOtpDTO ){
        return this.otpService.generate(dto);
    }

    @Post("/verify")
    async verify(@Body() dto: VerifyOtpDTO) {
        return this.otpService.verify(dto);
    }
}