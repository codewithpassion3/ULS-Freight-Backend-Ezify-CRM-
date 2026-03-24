import { IsEmail, IsInt, IsOptional, IsString, Matches } from "class-validator"

export class UpdateAddressBook {
    @IsOptional()
    @IsString()
    companyName: string;

    @IsOptional()
    @IsString()
    contactId: string;

    @IsOptional()
    @IsString()
    contactName: string;


    @IsOptional()
    @IsString()
    @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "Phone number must be in international format (e.g., +923001234567)"
    })
    phoneNumber: string;

    @IsOptional()
    @IsString()
    defaultInstructions: string;

    @IsOptional()
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    address1: string;
    
    @IsOptional()
    @IsString()
    address2: string;
    
    @IsOptional()
    @IsString()
    postalCode: string;

    @IsOptional()
    @IsString()
    unit: string;

    @IsOptional()
    @IsString()
    city: string;

    @IsOptional()
    @IsString()
    state: string;

    @IsOptional()
    @IsString()
    country: string;

    @IsOptional()
    @IsInt()
    locationTypeId!: number

    @IsOptional()
    @IsInt()
    signatureId!: number
}