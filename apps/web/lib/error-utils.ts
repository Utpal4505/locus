import { HttpError, NetworkError } from "@locus/api-client";

/**
 * Extracts a safe user-facing message from an unknown error (e.g. from apiClient or fetch).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  if (error instanceof HttpError) {
    return error.message || fallback;
  }
  if (error instanceof NetworkError) {
    return "Unable to connect to the server. Please check your network connection.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }
  return fallback;
}

/**
 * Extracts an optional machine-readable error code if present on the error.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof HttpError) {
    return error.code;
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string"
  ) {
    return (error as Record<string, unknown>).code as string;
  }
  return undefined;
}
