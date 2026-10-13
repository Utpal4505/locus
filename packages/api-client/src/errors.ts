import axios from "axios";

export abstract class ApiClientError extends Error {
  abstract readonly type: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HttpError extends ApiClientError {
  readonly type = "HTTP_ERROR" as const;

  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly data: unknown,
  ) {
    super(`HTTP ${status} ${statusText}`.trim());
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
      return new ResponseParsingError(
        "Failed to parse response body as JSON",
        { cause: error },
      );
    }

    return new NetworkError("Network request failed", {
      cause: error,
      code: error.code,
    });
  }

  if (error instanceof SyntaxError) {
    return new ResponseParsingError(
      "Failed to parse response body as JSON",
      { cause: error },
    );
  }

  return new NetworkError(
    error instanceof Error ? error.message : "Network request failed",
    { cause: error },
  );
}

