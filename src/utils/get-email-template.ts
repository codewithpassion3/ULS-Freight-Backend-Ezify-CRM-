import { EmailTemplate } from "src/common/enum/email-template.enum";

const TEMPLATE_MAP: Record<EmailTemplate, string> = {
  [EmailTemplate.VERIFY_EMAIL]: "verify-email",
  [EmailTemplate.FORGOT_PASSWORD]: "forgot-password",
  [EmailTemplate.SPOT_QUOTE_CREATED]: "spot-quote-created",
};

export const getEmailTemplate = (template: EmailTemplate): string => {
  return TEMPLATE_MAP[template];
};