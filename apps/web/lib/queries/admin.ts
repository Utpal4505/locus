"use client";

import { useQuery } from "@tanstack/react-query";
import {
  adminMetricsResponseSchema,
  type AdminMetricsResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

/**
 * Hook for retrieving platform telemetry, user growth, sync health, and storage metrics.
 */
export function useAdminMetricsQuery(enabled = true, refetchInterval: number | false = 30000) {
  return useQuery({
    queryKey: queryKeys.admin.metrics(),
    queryFn: async ({ signal }) => {
      return apiClient.get<AdminMetricsResponse>("/api/admin/metrics", {
        schema: adminMetricsResponseSchema,
        signal,
      });
    },
    enabled,
    refetchInterval,
  });
}

