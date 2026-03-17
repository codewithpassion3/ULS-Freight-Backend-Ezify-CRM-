export interface EmailTemplate {
    to: string;
    subject: string;
    text?: string;
    template?: string;
    context: {
        email?: string;
        password?: string;
        loginUrl?: string;
        companyName?: string;
        administratorName?: string;
        name?: string;
        otp?: string;
    };
}