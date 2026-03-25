import { IsNotEmpty, IsString } from "class-validator";

export class CreatePalletShippingLocationTypeDTO {
    @IsNotEmpty()
    @IsString()
    locationType!: string;

    @IsNotEmpty()
    @IsString()
    name!: string;
}