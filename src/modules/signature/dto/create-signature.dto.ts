import { IsNotEmpty, IsString } from "class-validator";

export class CreateSignatureDTO {
    @IsNotEmpty()
    @IsString()
    type!: string;


    @IsNotEmpty()
    @IsString()
    name!: string;
}