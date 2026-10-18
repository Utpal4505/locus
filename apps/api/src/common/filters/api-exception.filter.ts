import {
  type ArgumentsHost,
  type ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If response headers were already sent, delegate to Express default
    if (response.headersSent) {
      return;
    }

    const path = request?.originalUrl || request?.url || "";

    // Do not force Better Auth's /api/auth/* responses into custom format
    if (path.startsWith("/api/auth")) {
      if (exception instanceof HttpException) {
        return response
          .status(exception.getStatus())
          .json(exception.getResponse());
      }
      this.logger.error(
        `Unexpected error in auth route ${request?.method} ${path}: ${(exception as Error)?.message || String(exception)}`,
        (exception as Error)?.stack,
      );
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: "Internal server error",
      });
    }

    // Standardized NestJS API routes error handling
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      let code = this.getErrorCodeForStatus(status);
      let message = exception.message || "Request failed";
      let details: unknown;

      if (typeof res === "object" && res !== null) {
        const obj = res as Record<string, unknown>;

        if (typeof obj.code === "string" && obj.code.trim().length > 0) {
          code = obj.code.trim();
        }

        if (Array.isArray(obj.message)) {
          message = obj.message.filter((m) => typeof m === "string").join(", ");
          code = code === "BAD_REQUEST" ? "VALIDATION_ERROR" : code;
          details = { errors: obj.message };
        } else if (
          typeof obj.message === "string" &&
          obj.message.trim().length > 0
        ) {
          message = obj.message.trim();
        } else if (
          typeof obj.error === "string" &&
          obj.error.trim().length > 0
        ) {
          message = obj.error.trim();
        }

        if (obj.details !== undefined && details === undefined) {
          details = obj.details;
        }
      } else if (typeof res === "string" && res.trim().length > 0) {
        message = res.trim();
      }

      // If status is >= 500, always log and use generic message to avoid leaking internal error strings
      if (status >= 500) {
        this.logger.error(
          `Server error (${status}) on ${request?.method} ${path}: ${exception.message}`,
          exception.stack,
        );
        return response.status(status).json({
          statusCode: status,
          code: code === "HTTP_ERROR" ? "INTERNAL_ERROR" : code,
          message: "An unexpected server error occurred.",
        });
      }

      this.logger.warn(
        `HTTP ${status} [${code}] on ${request?.method} ${path}: ${message}`,
      );

      const payload: Record<string, unknown> = {
        statusCode: status,
        code,
        message,
      };

      if (details !== undefined) {
        payload.details = details;
      }

      return response.status(status).json(payload);
    }

    // Unhandled / unexpected non-HttpExceptions (Error, TypeError, DatabaseError, etc.)
    const err = exception as Error;
    this.logger.error(
      `Unhandled exception on ${request?.method} ${path}: ${err?.message || String(exception)}`,
      err?.stack,
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    });
  }

  private getErrorCodeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "UNPROCESSABLE_ENTITY";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "TOO_MANY_REQUESTS";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "SERVICE_UNAVAILABLE";
      case HttpStatus.GATEWAY_TIMEOUT:
        return "GATEWAY_TIMEOUT";
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return "INTERNAL_ERROR";
      default:
        return "HTTP_ERROR";
    }
  }
}

