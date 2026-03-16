export interface EmailTemplate {
    to: string;
    subject: string;
    text?: string;
    template?: string;
    context: {
        name: string;
        otp: string;
    };
}