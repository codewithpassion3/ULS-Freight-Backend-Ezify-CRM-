import { Transform, Exclude, Expose } from 'class-transformer';

export class RecentContactDto {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ obj }) => obj.addressBook?.companyName)
  companyName!: string;

  @Expose()
  @Transform(({ obj }) => obj.addressBook?.contactId)
  contactId!: string;

  @Expose()
  @Transform(({ obj }) => obj.addressBook?.contactName)
  contactName!: string;

  @Expose()
  @Transform(({ obj }) => obj.addressBook?.phoneNumber)
  phoneNumber!: string;

  @Expose()
  @Transform(({ obj }) => obj.addressBook?.defaultInstructions)
  defaultInstructions!: string;

  @Expose()
  @Transform(({ obj }) => obj.addressBook?.email)
  email!: string;

  // Address fields flattened
  @Expose()
  @Transform(({ obj }) => obj.addressBook?.address)
  address!: Record<string,any>;
}