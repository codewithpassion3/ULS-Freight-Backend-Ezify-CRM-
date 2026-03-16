import { ManyToOne } from "@mikro-orm/core";
import { IsEnum, IsOptional } from "class-validator";
import { ShippingType } from "src/common/enum/shipping-type.enum";
import { Company } from "src/entities/company.entity";

export class CompanyShippingPreferenceEntity {
    @IsEnum(ShippingType)
    shippingType: string;

    @IsOptional()
    shippingVolume: string;

    @ManyToOne(() => Company)
    company: Company
}