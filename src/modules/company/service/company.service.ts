import { EntityManager } from "@mikro-orm/postgresql";
import { UpdateCompanyDTO } from "../dto/update-company.dto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Company } from "src/entities/company.entity";
import { wrap } from "@mikro-orm/core";
@Injectable()
export class CompanyService {
    constructor(private readonly em: EntityManager) {}

    async update(dto: UpdateCompanyDTO, companyId: number, session: Record<string,any>) {
        //1) Check if company belongs to current user
        if(session.companyId !== companyId){
           throw new ForbiddenException("You can only update your own company");
        }

        //2) Extract fields
        const {
            name,
            industryType,
            unit,
            city,
            state,
            country,
            postalCode,
            address1,
            address2
        } = dto;

        //3) Find company with address relation
        const company = await this.em.findOne(
            Company,
            { id: companyId },
            { populate: ["address"] }
        );

        //4) Throw error for missing company
        if (!company) {
            throw new NotFoundException("Company not found");
        }

        //5) Update company fields
        wrap(company).assign({
            name,
            industryType
        }, { ignoreUndefined: true });

        //6) Update address fields if relation exists
        if (company.address) {
            wrap(company.address).assign({
                unit,
                city,
                state,
                country,
                postalCode,
                address1,
                address2
            }, { ignoreUndefined: true });
        }

        //7) Persist changes
        await this.em.flush();

        //8) Return back success response
        return {
            message: "Company updated successfully"
        };
    }
}