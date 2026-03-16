import { Body, Controller, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { UpdateCompanyDTO } from "../dto/update-company.dto";
import { CompanyService } from "../service/company.service";
import type { Request } from "express";

@Controller("companies")
export class CompanyController {
    constructor(private readonly companyService: CompanyService) {}

    @UseGuards(SessionAuthGuard)
    @Patch("/:id")
    async Update(@Body() dto: UpdateCompanyDTO, @Param("id") companyId: number, @Req() req: Request) {
        const session = req.session;
        
        return this.companyService.update(dto, companyId, session);
    }

}