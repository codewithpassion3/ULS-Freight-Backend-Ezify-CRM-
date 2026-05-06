import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { UniqueConstraintViolationException, ValidationError } from "@mikro-orm/core";
import Stripe from "stripe";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private extractFieldName = (constraintName: string): string => {
    const match = constraintName.match(/_([^_]+)_unique$/);
    return match ? match[1] : constraintName;
  };

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = "Internal server error";
    let exceptionResponse: any;
    let stripeCode: string | undefined;

    // 1) NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === "string"
          ? exceptionResponse
          : (exceptionResponse as any).message;
    }

    // 2) Stripe errors
    else if (exception instanceof Stripe.errors.StripeError) {
      status = HttpStatus.BAD_REQUEST;
      stripeCode = exception.code || undefined;
      
      if (exception instanceof Stripe.errors.StripeInvalidRequestError) {
        // resource_missing, amount_too_small, etc.
        message = this.mapStripeErrorMessage(exception);
      } else if (exception instanceof Stripe.errors.StripeCardError) {
        // card_declined, insufficient_funds, etc.
        message = exception.message || "Card payment failed";
      } else if (exception instanceof Stripe.errors.StripeAPIError) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = "Payment service temporarily unavailable. Please try again.";
      } else if (exception instanceof Stripe.errors.StripeConnectionError) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = "Unable to connect to payment provider. Please try again.";
      } else if (exception instanceof Stripe.errors.StripeAuthenticationError) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Payment configuration error";
        console.error("Stripe authentication error:", exception.message);
      } else {
        message = exception.message || "Payment processing error";
      }
    }

    // 3) MikroORM validation
    else if (exception instanceof ValidationError) {
      const rawMessage = exception.message;
      const match = rawMessage.match(/Value for (\w+\.\w+) is required, 'undefined' found/);
      const field = match?.[1];
      const cleanMessage = field ? `${field} is required or undefined` : rawMessage;
      
      status = HttpStatus.BAD_REQUEST;
      message = cleanMessage;
    }

    // 4) MikroORM unique constraint
    else if (exception instanceof UniqueConstraintViolationException) {
      status = HttpStatus.CONFLICT;
      const constraint = (exception as any).constraint;
      if (constraint === "user_email_unique") {
        message = "Email already exists";
      } else if (constraint === "user_phone_number_unique") {
        message = "Phone number already exists";
      } else {
        message = constraint;
      }
    }

    // 5) PostgreSQL raw errors
    else if ((exception as any).code === "23505") {
      status = HttpStatus.CONFLICT;
      message = "Duplicate record already exists";
    } else if ((exception as any).code === "23503") {
      status = HttpStatus.BAD_REQUEST;
      message = "Invalid reference to related record";
    } else if ((exception as any).code === "23502") {
      status = HttpStatus.BAD_REQUEST;
      message = "Required database field missing";
    }

    // 6) Unknown error logging
    else {
      console.error("Unhandled exception:", exception);
    }

    // 7) Construct response
    const errorResponse: any = {
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (stripeCode) {
      errorResponse.stripeCode = stripeCode;
    }

    if (exceptionResponse?.errorCode) {
      errorResponse.errorCode = exceptionResponse.errorCode;
    }

    response.status(status).json(errorResponse);
  }

  private mapStripeErrorMessage(error: any): string {
    const code = error.code;
    const param = (error as any).param;

    switch (code) {
      case "resource_missing":
        if (param === "payment_method") {
          return "Payment method not found. It may have expired or was never created.";
        }
        if (param === "customer") {
          return "Customer account not found. Please create one first.";
        }
        return `Requested resource not found: ${param || error.message}`;
      
      case "amount_too_small":
        return "Amount is too small. Minimum charge is 50 cents.";
      
      case "amount_too_large":
        return "Amount exceeds maximum allowed charge.";
      
      case "currency_not_supported":
        return "Selected currency is not supported.";
      
      case "incorrect_number":
        return "The card number is incorrect.";
      
      case "invalid_expiry_month":
      case "invalid_expiry_year":
        return "The card expiration date is invalid.";
      
      case "invalid_cvc":
        return "The card security code is invalid.";
      
      case "expired_card":
        return "The card has expired.";
      
      case "incorrect_cvc":
        return "The card security code is incorrect.";
      
      case "incorrect_zip":
        return "The card zip code failed validation.";
      
      case "card_declined":
        return "The card was declined.";
      
      case "missing":
        return `Required parameter missing: ${param || "unknown"}`;
      
      case "processing_error":
        return "An error occurred while processing the card.";
      
      case "issuer_not_available":
        return "The card issuer could not be reached. Please try again.";
      
      case "try_again_later":
        return "Temporary issue processing the payment. Please try again.";
      
      default:
        return error.message || "Invalid payment request";
    }
  }
}