import { Module } from "@nestjs/common";
import { SignatureController } from "./controller/signature.controller";
import { SignatureService } from "./service/signature.service"

@Module({
    controllers: [SignatureController],
    providers: [SignatureService]
})

export class SignatureModule {}