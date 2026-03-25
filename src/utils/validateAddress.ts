import { CreateAddressDto } from "src/modules/quote/dto/create-quote.dto";

export function validateAddress(dto: CreateAddressDto): string[] {
  const errors: string[] = [];

  const isManual = !dto.addressBookId;

  if (isManual) {
    const requiredFields = [
      'address1',
      'city',
      'state',
      'country',
      'postalCode',
    ];

    for (const field of requiredFields) {
      if (!dto[field]) {
        errors.push(`${field} is required when not using addressBook`);
      }
    }
  }

  if (dto.addressBookId && isManual) {
    errors.push(`Cannot mix addressBookId with manual address fields`);
  }

  return errors;
}