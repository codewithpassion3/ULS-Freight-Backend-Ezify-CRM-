import { Entity } from "@mikro-orm/core";
import { IsNotEmpty, IsString } from "class-validator";

@Entity()
export class CreateSignatureDTO {
    @IsNotEmpty()
    @IsString()
    type!: string;


    @IsNotEmpty()
    @IsString()
    name!: string;
}