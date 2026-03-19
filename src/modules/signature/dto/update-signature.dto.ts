import { Entity } from "@mikro-orm/core";
import { IsOptional, IsString } from "class-validator";

@Entity()
export class UpdateSignatureDTO {
    @IsOptional()
    @IsString()
    type?: string;


    @IsOptional()
    @IsString()
    name?: string;
}