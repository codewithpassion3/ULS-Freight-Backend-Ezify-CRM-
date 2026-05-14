import { Quote } from "src/entities/quote.entity";

export interface EmailTemplate {
    to: string;
    subject: string;
    text?: string;
    template?: string;
    context: {
        invoiceNumber?: string;
        paymentDate?: Date;
        invoiceDate?: string;
        dueDate?: string;
        billTo?: Record<string, any>;
        surcharges?: Record<string, any>[];
        subtotal?: number;
        total?: number;
        email?: string;
        password?: string;
        loginUrl?: string;
        companyName?: string;
        administratorName?: string;
        estimatedAmount?: number;
        currency?: string;
        name?: string;
        otp?: string;
        contactNumber?: string;
        shipmentType?: string;
        measurementUnit?: string;
        createdAt?: string;
        createdBy?: string;
        lineItemUnits?: Array<{
        unitType?: string;
        quantity?: number;
        weight?: number;
        length?: number;
        width?: number;
        height?: number;
        }>;
  
    };
}

export interface SpotQuoteEmailTemplate extends EmailTemplate {
    quote: Partial<Quote>
}