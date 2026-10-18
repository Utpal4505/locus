import axios from "axios";

export abstract class ApiClientError extends Error {
  abstract readonly type: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface ExtractedErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Extracts a safe message, optional machine-readable error code, and details
 * from an HTTP error response body.
 */
function extractErrorInfo(
  status: number,
  statusText: string,
  data: unknown,
): ExtractedErrorInfo {
  const defaultFallbackMessage =
    `HTTP ${status} ${statusText}`.trim() || `HTTP ${status}`;

  if (!data) {
    return { message: defaultFallbackMessage };
  }

  // If response is a string
  if (typeof data === "string") {
    const trimmed = data.trim();
    // Never expose raw HTML error pages (e.g. 502/504 Bad Gateway from reverse proxies)
    if (
      trimmed.startsWith("<") ||
      trimmed.includes("<!DOCTYPE") ||
      trimmed.includes("<html")
    ) {
      return { message: defaultFallbackMessage };
    }
    // Only use short non-HTML string messages
    if (trimmed.length > 0 && trimmed.length < 500) {
      return { message: trimmed };
    }
    return { message: defaultFallbackMessage };
  }

  // If response is an object (standard JSON error)
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;

    let code: string | undefined;
    let message: string | undefined;
    let details: unknown | undefined;

    // 1. Check for machine-readable code
    if (typeof obj.code === "string" && obj.code.trim().length > 0) {
      code = obj.code.trim();
    } else if (
      obj.error &&
      typeof obj.error === "object" &&
      typeof (obj.error as Record<string, unknown>).code === "string"
    ) {
      code = ((obj.error as Record<string, unknown>).code as string).trim();
    }

    // 2. Check for details
    if (obj.details !== undefined) {
      details = obj.details;
    } else if (
      obj.error &&
      typeof obj.error === "object" &&
      "details" in (obj.error as object)
    ) {
      details = (obj.error as Record<string, unknown>).details;
    }

    // 3. Check for safe message
    if (typeof obj.message === "string" && obj.message.trim().length > 0) {
      message = obj.message.trim();
    } else if (Array.isArray(obj.message) && obj.message.length > 0) {
      message = obj.message.filter((m) => typeof m === "string").join(", ");
    } else if (
      obj.error &&
      typeof obj.error === "object" &&
      typeof (obj.error as Record<string, unknown>).message === "string"
    ) {
      message = (
        (obj.error as Record<string, unknown>).message as string
      ).trim();
    } else if (typeof obj.error === "string" && obj.error.trim().length > 0) {
      message = obj.error.trim();
    }

    return {
      message: message || defaultFallbackMessage,
      code,
      details,
    };
  }

  return { message: defaultFallbackMessage };
}

export class HttpError extends ApiClientError {
  readonly type = "HTTP_ERROR" as const;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly data: unknown,
  ) {
    const extracted = extractErrorInfo(status, statusText, data);
    super(extracted.message);
    this.code = extracted.code;
    this.details = extracted.details;
  }

  get body(): unknown {
    return this.data;
  }
}

export class NetworkError extends ApiClientError {
  readonly type = "NETWORK_ERROR" as const;
  readonly code?: string;

  constructor(
    message = "Network request failed",
    options?: { cause?: unknown; code?: string },
  ) {
    super(message, { cause: options?.cause });
    this.code = options?.code;
  }
}

export class ResponseParsingError extends ApiClientError {
  readonly type = "RESPONSE_PARSING_ERROR" as const;

  constructor(
    message = "Failed to parse response body as JSON",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export { ResponseParsingError as JsonParseError };

export class ResponseValidationError extends ApiClientError {
  readonly type = "RESPONSE_VALIDATION_ERROR" as const;

  constructor(
    readonly issues: readonly unknown[],
    readonly rawData?: unknown,
  ) {
    super("Response body failed schema validation");
  }
}

export { ResponseValidationError as SchemaValidationError };

export class RequestCancelledError extends ApiClientError {
  readonly type = "REQUEST_CANCELLED" as const;

  constructor(message = "Request was cancelled", options?: ErrorOptions) {
    super(message, options);
  }
}

export { RequestCancelledError as CancellationError };

export function normalizeError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (
    axios.isCancel(error) ||
    (error instanceof Error &&
      (error.name === "CanceledError" || error.name === "AbortError"))
  ) {
    return new RequestCancelledError("Request was cancelled", {
      cause: error,
    });
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      return new HttpError(
        error.response.status,
        error.response.statusText,
        error.response.data,
      );
    }

    if (
      error.code === "ERR_BAD_RESPONSE" ||
      error.cause instanceof SyntaxError
    ) {
      return new ResponseParsingError("Failed to parse response body as JSON", {
        cause: error,
      });
    }

    return new NetworkError("Network request failed", {
      cause: error,
      code: error.code,
    });
  }

  if (error instanceof SyntaxError) {
    return new ResponseParsingError("Failed to parse response body as JSON", {
      cause: error,
    });
  }

  return new NetworkError(
    error instanceof Error ? error.message : "Network request failed",
    { cause: error },
  );
}
