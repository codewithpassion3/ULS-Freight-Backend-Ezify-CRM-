import { UseGuards, Controller, Get, Post, Delete, Patch, Param, Body } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { SignatureService } from "../service/signature.service";
import { RolesGuard } from "src/guards/roles.guard";
import { Role } from "src/decorators/role.decorator";
import { ROLES } from "src/common/constants/roles";
import { CreateSignatureDTO } from "../dto/create-signature.dto";
import { UpdateSignatureDTO } from "../dto/update-signature.dto";

@Controller("signatures")
export class SignatureController {
    constructor(private readonly signatureService: SignatureService) {}

    @UseGuards(SessionAuthGuard)
    @Get("/")
    async GetAllSignatures(){
        return this.signatureService.getAll();
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Post("/")
    async CreateSignature(@Body() dto: CreateSignatureDTO){
        return this.signatureService.create(dto)
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Patch("/:id")
    async UpdateSignature(@Body() dto: UpdateSignatureDTO, @Param("id") signatureId: number){
        return this.signatureService.update(dto, signatureId)
    }

    @UseGuards(SessionAuthGuard, RolesGuard)
    @Role([ROLES.ADMIN])
    @Delete("/:id")
    async DeleteSignature(@Param("id") signatureId: number){
        return this.signatureService.delete(signatureId)
    }
}