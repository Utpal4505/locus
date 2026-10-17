import { createApiClient } from "@locus/api-client";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export const apiClient = createApiClient({
  baseURL,
  withCredentials: true,
});

