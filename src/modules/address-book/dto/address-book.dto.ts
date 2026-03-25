import { Expose, Transform, Type } from "class-transformer";

export class AddressDto {
  @Expose()
  address1: string;

  @Expose()
  address2: string;

  @Expose()
  postalCode: string;

  @Expose()
  unit: string;

  @Expose()
  city: string;

  @Expose()
  state: string;

  @Expose()
  country: string;
}

export class AddressBookResponseDto {
  @Expose()
  companyName: string;

  @Expose()
  contactId: number;

  @Expose()
  contactName: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  isResidential: boolean;

  @Expose()
  @Transform(({ obj }) => obj.signature?.id)
  signatureId: number;

  @Expose()
  @Transform(({ obj }) => obj.locationType?.id)
  locationTypeId: number;

  @Expose()
  palletShippingReadyTime: string;

  @Expose()
  palletShippingCloseTime: string;

  @Expose()
  defaultInstructions: string;

  @Expose()
  email: string;

  @Expose()
  @Type(() => AddressDto)
  address: AddressDto;
}