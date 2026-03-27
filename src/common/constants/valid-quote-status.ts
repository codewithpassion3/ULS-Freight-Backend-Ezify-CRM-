import { QuoteStatus } from "../enum/quote-status";

export const VALID_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
    [QuoteStatus.DRAFT]: [QuoteStatus.SAVED],
    [QuoteStatus.SAVED]: [QuoteStatus.ARCHIVED, QuoteStatus.SUBMITTED],
    [QuoteStatus.ARCHIVED]: [],
    [QuoteStatus.SUBMITTED]: []
};