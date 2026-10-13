import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CreateAxiosDefaults,
  type Method,
} from "axios";
import type { z } from "@locus/contracts";

import {
  ResponseParsingError,
  ResponseValidationError,
  normalizeError,
} from "./errors.js";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface ApiClientConfig {
  baseURL: string;
  headers?: Record<string, string>;
  axiosConfig?: Omit<CreateAxiosDefaults, "baseURL" | "headers">;
}

export interface RequestOptions<TSchema extends z.ZodType = z.ZodType> {
  method?: HttpMethod;
  url?: string;
  path?: string;
  params?: Record<string, unknown> | URLSearchParams;
  query?: Record<string, unknown>;
  data?: unknown;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  schema?: TSchema;
  axiosConfig?: Omit<
    AxiosRequestConfig,
    "url" | "method" | "params" | "data" | "headers" | "signal"
  >;
}

export interface ApiClient {
  request<TSchema extends z.ZodType>(
    options: RequestOptions<TSchema> & { schema: TSchema },
  ): Promise<z.infer<TSchema>>;
  request<TData = unknown>(options: RequestOptions): Promise<TData>;

  requestVoid(options: Omit<RequestOptions, "schema">): Promise<void>;

  get<TSchema extends z.ZodType>(
    url: string,
    options: Omit<RequestOptions<TSchema>, "url" | "path" | "method"> & {
      schema: TSchema;
    },
  ): Promise<z.infer<TSchema>>;
  get<TData = unknown>(
    url: string,
    options?: Omit<RequestOptions, "url" | "path" | "method">,
  ): Promise<TData>;

  post<TSchema extends z.ZodType>(
    url: string,
    data?: unknown,
    options?: Omit<
      RequestOptions<TSchema>,
      "url" | "path" | "method" | "data" | "body"
    > & { schema: TSchema },
  ): Promise<z.infer<TSchema>>;
  post<TData = unknown>(
    url: string,
    data?: unknown,
    options?: Omit<RequestOptions, "url" | "path" | "method" | "data" | "body">,
  ): Promise<TData>;

  put<TSchema extends z.ZodType>(
    url: string,
    data?: unknown,
    options?: Omit<
      RequestOptions<TSchema>,
      "url" | "path" | "method" | "data" | "body"
    > & { schema: TSchema },
  ): Promise<z.infer<TSchema>>;
  put<TData = unknown>(
    url: string,
    data?: unknown,
    options?: Omit<RequestOptions, "url" | "path" | "method" | "data" | "body">,
  ): Promise<TData>;

  patch<TSchema extends z.ZodType>(
    url: string,
    data?: unknown,
    options?: Omit<
      RequestOptions<TSchema>,
      "url" | "path" | "method" | "data" | "body"
    > & { schema: TSchema },
  ): Promise<z.infer<TSchema>>;
  patch<TData = unknown>(
    url: string,
    data?: unknown,
    options?: Omit<RequestOptions, "url" | "path" | "method" | "data" | "body">,
  ): Promise<TData>;

  delete<TSchema extends z.ZodType>(
    url: string,
    options: Omit<RequestOptions<TSchema>, "url" | "path" | "method"> & {
      schema: TSchema;
    },
  ): Promise<z.infer<TSchema>>;
  delete<TData = unknown>(
    url: string,
    options?: Omit<RequestOptions, "url" | "path" | "method">,
  ): Promise<TData>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  if (!config || typeof config.baseURL !== "string" || !config.baseURL.trim()) {
    throw new Error(
      "ApiClient requires an explicit, non-empty 'baseURL'. Silently falling back to localhost is not permitted.",
    );
  }

  const instance = axios.create({
    baseURL: config.baseURL.trim(),
    headers: {
      Accept: "application/json",
      ...config.headers,
    },
    ...config.axiosConfig,
  });

  return {
    request: ((options: RequestOptions) =>
      executeRequest(instance, options)) as ApiClient["request"],

    requestVoid: (options: Omit<RequestOptions, "schema">) =>
      executeRequest(instance, options, true) as Promise<void>,

    get: ((url: string, options?: Omit<RequestOptions, "url" | "path" | "method">) =>
      executeRequest(instance, {
        ...options,
        url,
        method: "GET",
      })) as ApiClient["get"],

    post: ((
      url: string,
      data?: unknown,
      options?: Omit<RequestOptions, "url" | "path" | "method" | "data" | "body">,
    ) =>
      executeRequest(instance, {
        ...options,
        url,
        data,
        method: "POST",
      })) as ApiClient["post"],

    put: ((
      url: string,
      data?: unknown,
      options?: Omit<RequestOptions, "url" | "path" | "method" | "data" | "body">,
    ) =>
      executeRequest(instance, {
        ...options,
        url,
        data,
        method: "PUT",
      })) as ApiClient["put"],

    patch: ((
      url: string,
      data?: unknown,
      options?: Omit<RequestOptions, "url" | "path" | "method" | "data" | "body">,
    ) =>
      executeRequest(instance, {
        ...options,
        url,
        data,
        method: "PATCH",
      })) as ApiClient["patch"],

    delete: ((
      url: string,
      options?: Omit<RequestOptions, "url" | "path" | "method">,
    ) =>
      executeRequest(instance, {
        ...options,
        url,
        method: "DELETE",
      })) as ApiClient["delete"],
  };
}

async function executeRequest<TSchema extends z.ZodType>(
  axiosInstance: AxiosInstance,
  options: RequestOptions<TSchema>,
  expectVoid = false,
): Promise<unknown> {
  const url = options.url ?? options.path ?? "";
  const method = (options.method ?? "GET") as Method;
  const params = options.params ?? options.query;
  const data = options.data ?? options.body;

  try {
    const response = await axiosInstance.request({
      url,
      method,
      params,
      data,
      headers: options.headers,
      signal: options.signal,
      ...options.axiosConfig,
    });

    if (response.status === 204 || expectVoid) {
      return undefined;
    }

    let responseData = response.data;

    const contentType = response.headers?.["content-type"];
    if (
      typeof responseData === "string" &&
      typeof contentType === "string" &&
      contentType.includes("application/json") &&
      responseData.trim().length > 0
    ) {
      try {
        responseData = JSON.parse(responseData);
      } catch (err) {
        throw new ResponseParsingError(
          "Failed to parse response body as JSON",
          { cause: err },
        );
      }
    }

    if (options.schema) {
      const parseResult = options.schema.safeParse(responseData);
      if (!parseResult.success) {
        throw new ResponseValidationError(
          parseResult.error.issues,
          responseData,
        );
      }
      return parseResult.data;
    }

    return responseData;
  } catch (error) {
    throw normalizeError(error);
  }
}

