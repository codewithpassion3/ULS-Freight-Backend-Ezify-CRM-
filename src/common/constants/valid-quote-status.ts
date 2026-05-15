import { QuoteStatus } from "../enum/quote-status";

export const VALID_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
    [QuoteStatus.DRAFT]: [QuoteStatus.CONVERTED_TO_SHIPMENT],
    [QuoteStatus.SAVED]: [QuoteStatus.CONVERTED_TO_SHIPMENT],
    [QuoteStatus.ARCHIVED]: [],
    [QuoteStatus.SUBMITTED]: [],
    [QuoteStatus.CONVERTED_TO_SHIPMENT]: []
};