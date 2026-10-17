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

    await client.post("/items", { name: "test" }, {
      headers: { "X-Custom": "custom-val" },
    });

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

    assert.deepStrictEqual(methodsUsed, ["GET", "POST", "PUT", "PATCH", "DELETE"]);
  });
});

