import { Module } from "@nestjs/common";
import { PostalCodeController } from "./controller/postal-code.controller";
import { PostalCodeService } from "./service/postal-code.service";

@Module({
    controllers: [PostalCodeController],
    providers: [PostalCodeService]
})

export class PostalCodeModule {}