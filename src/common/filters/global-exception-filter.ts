import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import { UniqueConstraintViolationException, ValidationError } from "@mikro-orm/core";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private extractFieldName = (constraintName: string): string => {
      // Match: anything before _unique, captured between the last two underscores
      // Example: "shipment_trackingNumber_unique" → "trackingNumber"
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

    //1) NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();

      exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === "string"
          ? exceptionResponse
          : (exceptionResponse as any).message;
    }

    else if (exception instanceof ValidationError) {
      // extract raw message
      const rawMessage = exception.message;

      // Get the field name through regex
      const match = rawMessage.match(/Value for (\w+\.\w+) is required, 'undefined' found/);
      const field = match?.[1];

      // Construct error message
      const cleanMessage = field ? `${field} is required or undefined` : rawMessage;
      
      // Set error message status and message
      status = HttpStatus.BAD_REQUEST;
      message = cleanMessage
    }

    //2) MikroORM unique constraint
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

    //3) PostgreSQL raw errors
    else if ((exception as any).code === "23505") {
      status = HttpStatus.CONFLICT;
      message = "Duplicate record already exists";
    }

    else if ((exception as any).code === "23503") {
      status = HttpStatus.BAD_REQUEST;
      message = "Invalid reference to related record";
    }

    else if ((exception as any).code === "23502") {
      status = HttpStatus.BAD_REQUEST;
      message = "Required database field missing";
    }

    //4) Unknown error logging
    else {
      console.error("Unhandled exception:", exception);
    }

    //5) Construct exception error message
    let errorResponse = {
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    }

    //6) Check for errorCode
    if(exceptionResponse?.errorCode) errorResponse["errorCode"] = exceptionResponse.errorCode;
    
    
    //7) Return back exception response
    response.status(status).json(errorResponse);
  }
}