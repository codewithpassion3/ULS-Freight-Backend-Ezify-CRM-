import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsEmail, IsInt, Matches } from "class-validator";
import { AddressDTO } from "src/modules/auth/dto/address.dto";
import { Type } from "class-transformer";

export class CreateAddressBookDTO {
    @IsString()
    @IsNotEmpty()
    companyName!: string;

    @IsString()
    @IsOptional()
    contactId?: string;

    @IsString()
    @IsNotEmpty()
    contactName!: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^\+[1-9]\d{7,14}$/, {
            message: "Phone number must be in international format (e.g., +923001234567)"
    })
    phoneNumber!: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    defaultInstructions?: string;

    @Matches(/^(0[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i, {
        message: "Time must be in 12-hour format with 2-digit hour (e.g., 10:00 AM, 04:00 PM)"
    })
    @IsNotEmpty()
    palletShippingReadyTime!: string;

    @Matches(/^(0[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i, {
        message: "Time must be in 12-hour format with 2-digit hour (e.g., 10:00 AM, 04:00 PM)"
    })
    
    @IsNotEmpty()
    palletShippingCloseTime!: string;


    @IsNotEmpty()
    @ValidateNested()
    @Type(() => AddressDTO)
    address!: AddressDTO;

    @IsNotEmpty()
    @IsInt()
    locationTypeId!: number

    @IsNotEmpty()
    @IsInt()
    signatureId!: number
}