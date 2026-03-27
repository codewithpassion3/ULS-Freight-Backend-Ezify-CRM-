import { IsEnum, IsNotEmpty } from "class-validator";
import { QuoteStatus } from "src/common/enum/quote-status";

export class UpdateQuoteStatusDTO {
    @IsNotEmpty()
    @IsEnum(QuoteStatus)
    status!: QuoteStatus
}