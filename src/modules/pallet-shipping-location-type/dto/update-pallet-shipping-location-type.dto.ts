import { IsOptional, IsString } from "class-validator";

export class UpdatePalletShippingLocationTypeDTO {
    @IsOptional()
    @IsString()
    locationType?: string;

    @IsOptional()
    @IsString()
    name?: string;
}