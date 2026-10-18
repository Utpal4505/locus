import { describe, expect, it, vi } from "vitest";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiExceptionFilter } from "./api-exception.filter.js";

describe("ApiExceptionFilter", () => {
  const filter = new ApiExceptionFilter();

  function createMockHost(path = "/items", headersSent = false) {
    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    const mockResponse = {
      headersSent,
      status: mockStatus,
      json: mockJson,
    };

    const mockRequest = {
      url: path,
      originalUrl: path,
      method: "GET",
    };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };

    return { mockHost, mockStatus, mockJson };
  }

  it("formats standard NestJS UnauthorizedException to standardized error response", () => {
    const { mockHost, mockStatus, mockJson } = createMockHost("/me");
    const exception = new UnauthorizedException("Authentication required to access this resource");

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required to access this resource",
    });
  });

  it("formats NotFoundException to standardized error response", () => {
    const { mockHost, mockStatus, mockJson } = createMockHost("/videos/123");
    const exception = new NotFoundException("Video not found");

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Video not found",
    });
  });

  it("formats validation array from BadRequestException with VALIDATION_ERROR code and details", () => {
    const { mockHost, mockStatus, mockJson } = createMockHost("/channels");
    const exception = new BadRequestException([
      "url must be a valid URL",
      "title should not be empty",
    ]);

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "url must be a valid URL, title should not be empty",
      details: {
        errors: ["url must be a valid URL", "title should not be empty"],
      },
    });
  });

  it("preserves explicit custom error code and details on HttpException", () => {
    const { mockHost, mockStatus, mockJson } = createMockHost("/channels/subscribe");
    const exception = new HttpException(
      {
        statusCode: 409,
        code: "CHANNEL_ALREADY_SUBSCRIBED",
        message: "You have already subscribed to this channel.",
        details: { channelId: "UC_123" },
      },
      HttpStatus.CONFLICT,
    );

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 409,
      code: "CHANNEL_ALREADY_SUBSCRIBED",
      message: "You have already subscribed to this channel.",
      details: { channelId: "UC_123" },
    });
  });

  it("masks unexpected errors with generic HTTP 500 without leaking internal messages", () => {
    const { mockHost, mockStatus, mockJson } = createMockHost("/data");
    const internalError = new Error("FATAL: database password incorrect at postgres://user:secret@db:5432");

    filter.catch(internalError, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    });

    const callArg = mockJson.mock.calls[0][0];
    expect(JSON.stringify(callArg)).not.toContain("postgres");
    expect(JSON.stringify(callArg)).not.toContain("password");
  });

  it("does not force Better Auth /api/auth routes into custom envelope", () => {
    const { mockHost, mockStatus, mockJson } = createMockHost("/api/auth/sign-in/email");
    const exception = new BadRequestException({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });

  it("does nothing when response headers have already been sent", () => {
    const { mockHost, mockStatus, mockJson } = createMockHost("/stream", true);
    const exception = new Error("Stream failure");

    filter.catch(exception, mockHost as any);

    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockJson).not.toHaveBeenCalled();
  });
});

