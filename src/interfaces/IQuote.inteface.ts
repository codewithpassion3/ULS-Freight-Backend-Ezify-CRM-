import { AddressData, QuoteConstructorParams } from "src/types/quote"

export interface IQuote {
  validateAddressDetails(addresses: AddressData[]): void
}

export interface IQuoteFactory {
  create(params: QuoteConstructorParams): any
}