import { QuoteType } from "src/common/enum/quote-type.enum";
import { CreateAddressDto } from "src/modules/quote/dto/create-quote.dto";

export function validateAddress(dto: CreateAddressDto, quoteType: string): string[] {
  const errors: string[] = [];

  const isManual = !dto.addressBookId;

  if (isManual) {
    const requiredFields = [
      'address1',
      'city',
      'state',
      'country',
      'postalCode'
    ];

    for (const field of requiredFields) {
      if (!dto[field]) {
        errors.push(`${field} in address payload is required when not using addressBook`);
      }
    }

    if (quoteType === QuoteType.SPOT) {
      const spotField = 'locationType'

      if (!dto[spotField]) {
        errors.push(`${spotField} is required for SPOT quotes`);
      }
    }
  }

  if (dto.addressBookId && (dto.address1 || dto.city || dto.state)) {
    errors.push('Cannot mix addressBookId with manual address fields');
  }
  return errors;
}