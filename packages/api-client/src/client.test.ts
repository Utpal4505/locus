import test, { describe, it } from "node:test";
import assert from "node:assert";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { z } from "@locus/contracts";
import {
  createApiClient,
  HttpError,
  ResponseParsingError,
  ResponseValidationError,
} from "./index";

function createMockAdapter(
  handler: (config: InternalAxiosRequestConfig) => Partial<AxiosResponse>,
) {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const partial = handler(config);
    return {
      data: partial.data ?? {},
      status: partial.status ?? 200,
      statusText: partial.statusText ?? "OK",
      headers: partial.headers ?? { "content-type": "application/json" },
      config,
    };
  };
}

describe("ApiClient - Credential Configuration", () => {
  it("defaults withCredentials to undefined when not specified", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/test");

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, undefined);
  });

  it("configures withCredentials: true when specified in ApiClientConfig", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      withCredentials: true,
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/test");

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, true);
  });

  it("configures withCredentials: false when explicitly disabled in ApiClientConfig", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      withCredentials: false,
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/test");

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, false);
  });

  it("supports withCredentials configured via axiosConfig passthrough", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        withCredentials: true,
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/test");

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, true);
  });

  it("allows axiosConfig.withCredentials to override top-level withCredentials", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      withCredentials: true,
      axiosConfig: {
        withCredentials: false,
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/test");

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, false);
  });

  it("allows per-request override of withCredentials to false", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      withCredentials: true,
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/public-resource", { withCredentials: false });

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, false);
  });

  it("allows per-request override of withCredentials to true", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      withCredentials: false,
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/secure-resource", { withCredentials: true });

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, true);
  });

  it("allows per-request override via axiosConfig.withCredentials", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      withCredentials: true,
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/public-resource", {
      axiosConfig: { withCredentials: false },
    });

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.withCredentials, false);
  });
});

describe("ApiClient - General Compatibility & Behaviors", () => {
  it("validates baseURL requirement", () => {
    assert.throws(
      () => createApiClient({ baseURL: "" }),
      /ApiClient requires an explicit, non-empty 'baseURL'/,
    );
    assert.throws(
      () => createApiClient({ baseURL: "   " }),
      /ApiClient requires an explicit, non-empty 'baseURL'/,
    );
  });

  it("merges custom and default headers", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      headers: { "X-App": "Locus" },
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          capturedConfig = cfg;
          return { data: { ok: true } };
        }),
      },
    });

    await client.post(
      "/items",
      { name: "test" },
      {
        headers: { "X-Custom": "custom-val" },
      },
    );

    assert.ok(capturedConfig);
    assert.strictEqual(capturedConfig.headers.Accept, "application/json");
    assert.strictEqual(capturedConfig.headers["X-App"], "Locus");
    assert.strictEqual(capturedConfig.headers["X-Custom"], "custom-val");
  });

  it("validates responses against Zod schema", async () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: createMockAdapter(() => ({
          data: { id: "u_1", name: "Alice" },
        })),
      },
    });

    const user = await client.get("/users/u_1", { schema: userSchema });
    assert.strictEqual(user.id, "u_1");
    assert.strictEqual(user.name, "Alice");
  });

  it("throws ResponseValidationError on schema mismatch", async () => {
    const userSchema = z.object({
      id: z.string(),
      count: z.number(),
    });

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: createMockAdapter(() => ({
          data: { id: "u_1", count: "invalid-number" },
        })),
      },
    });

    await assert.rejects(
      () => client.get("/users/u_1", { schema: userSchema }),
      (err: unknown) => {
        assert.ok(err instanceof ResponseValidationError);
        assert.strictEqual(err.name, "ResponseValidationError");
        return true;
      },
    );
  });

  it("throws ResponseParsingError on invalid JSON string with application/json header", async () => {
    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: createMockAdapter(() => ({
          data: "not a valid {json}",
          headers: { "content-type": "application/json" },
        })),
      },
    });

    await assert.rejects(
      () => client.get("/broken-json"),
      (err: unknown) => {
        assert.ok(err instanceof ResponseParsingError);
        assert.strictEqual(err.name, "ResponseParsingError");
        return true;
      },
    );
  });

  it("returns undefined for requestVoid and HTTP 204", async () => {
    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: createMockAdapter(() => ({
          data: "",
          status: 204,
        })),
      },
    });

    const result = await client.requestVoid({ url: "/ping", method: "DELETE" });
    assert.strictEqual(result, undefined);
  });

  it("handles HTTP error status codes with normalized HttpError", async () => {
    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: async (config) => {
          const error: any = new Error("Request failed with status code 401");
          error.isAxiosError = true;
          error.response = {
            status: 401,
            statusText: "Unauthorized",
            data: { message: "Authentication required" },
            headers: {},
            config,
          };
          error.config = config;
          throw error;
        },
      },
    });

    await assert.rejects(
      () => client.get("/me"),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.strictEqual(err.status, 401);
        assert.strictEqual(err.message, "Authentication required");
        return true;
      },
    );
  });

  it("extracts standardized Locus error response code, message, and details", async () => {
    const errorPayload = {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "The provided channel URL is invalid.",
      details: { field: "url", reason: "format" },
    };

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: async (config) => {
          const error: any = new Error("Request failed with status code 400");
          error.isAxiosError = true;
          error.response = {
            status: 400,
            statusText: "Bad Request",
            data: errorPayload,
            headers: {},
            config,
          };
          throw error;
        },
      },
    });

    await assert.rejects(
      () => client.post("/channels", { url: "invalid" }),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, "VALIDATION_ERROR");
        assert.strictEqual(err.message, "The provided channel URL is invalid.");
        assert.deepStrictEqual(err.details, { field: "url", reason: "format" });
        assert.deepStrictEqual(err.data, errorPayload);
        assert.deepStrictEqual(err.body, errorPayload);
        return true;
      },
    );
  });

  it("falls back safely to HTTP status text when error body is null, empty, or unexpected", async () => {
    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: async (config) => {
          const error: any = new Error("Request failed with status code 404");
          error.isAxiosError = true;
          error.response = {
            status: 404,
            statusText: "Not Found",
            data: null,
            headers: {},
            config,
          };
          throw error;
        },
      },
    });

    await assert.rejects(
      () => client.get("/missing"),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.strictEqual(err.status, 404);
        assert.strictEqual(err.code, undefined);
        assert.strictEqual(err.message, "HTTP 404 Not Found");
        assert.strictEqual(err.data, null);
        return true;
      },
    );
  });

  it("safely falls back to status text when server returns an HTML error page", async () => {
    const htmlPayload =
      "<!DOCTYPE html><html><body>502 Bad Gateway</body></html>";

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: async (config) => {
          const error: any = new Error("Request failed with status code 502");
          error.isAxiosError = true;
          error.response = {
            status: 502,
            statusText: "Bad Gateway",
            data: htmlPayload,
            headers: { "content-type": "text/html" },
            config,
          };
          throw error;
        },
      },
    });

    await assert.rejects(
      () => client.get("/broken-proxy"),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.strictEqual(err.status, 502);
        assert.strictEqual(err.message, "HTTP 502 Bad Gateway");
        assert.strictEqual(err.message.includes("<html"), false);
        assert.strictEqual(err.data, htmlPayload);
        return true;
      },
    );
  });

  it("extracts Better Auth error code and message", async () => {
    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: async (config) => {
          const error: any = new Error("Request failed with status code 400");
          error.isAxiosError = true;
          error.response = {
            status: 400,
            statusText: "Bad Request",
            data: {
              code: "USER_ALREADY_EXISTS",
              message: "User with this email already exists",
            },
            headers: {},
            config,
          };
          throw error;
        },
      },
    });

    await assert.rejects(
      () => client.post("/api/auth/sign-up", {}),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, "USER_ALREADY_EXISTS");
        assert.strictEqual(err.message, "User with this email already exists");
        return true;
      },
    );
  });

  it("executes all standard HTTP methods (GET, POST, PUT, PATCH, DELETE)", async () => {
    const methodsUsed: string[] = [];

    const client = createApiClient({
      baseURL: "http://localhost:3002",
      axiosConfig: {
        adapter: createMockAdapter((cfg) => {
          methodsUsed.push(cfg.method?.toUpperCase() ?? "");
          return { data: { success: true } };
        }),
      },
    });

    await client.get("/test");
    await client.post("/test", { a: 1 });
    await client.put("/test", { b: 2 });
    await client.patch("/test", { c: 3 });
    await client.delete("/test");

    assert.deepStrictEqual(methodsUsed, [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ]);
  });
});
