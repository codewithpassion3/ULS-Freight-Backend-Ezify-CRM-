import { IsNotEmpty, IsString } from "class-validator";

export class CompanyDTO {
    @IsNotEmpty()
    @IsString()
    name: string;
}