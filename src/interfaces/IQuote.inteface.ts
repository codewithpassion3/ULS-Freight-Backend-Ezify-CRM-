import { QuoteConstructorParams } from "src/types/quote"

export interface IQuote {
  validateAndReturn(): void
}

export interface IQuoteFactory {
  create(params: QuoteConstructorParams): any
}