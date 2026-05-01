import { Controller, Get, Param, Post, Session, UseGuards } from "@nestjs/common";
import { PostalCodeService } from "../service/postal-code.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";


@Controller("postal-codes")
export class PostalCodeController {
  constructor(private readonly seedService: PostalCodeService) {}

  @UseGuards(SessionAuthGuard)
  @Post("postal-codes")
  async SeedPostalCodes() {
    return this.seedService.seedPostalCodes();
  }

  @UseGuards(SessionAuthGuard)
  @Get(":postalCode")
  async GetAddressByPostalCode(@Param("postalCode") postalCode: string) {
    return this.seedService.getAddressByPostalCode(postalCode);
  }
}