"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  topicsListResponseSchema,
  classificationMetricsSchema,
  type TopicsListResponse,
  type ClassificationMetrics,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

/**
 * Hook for retrieving approved active technical topics for feed filtering.
 */
export function useTopicsQuery() {
  return useQuery({
    queryKey: queryKeys.topics.list(),
    queryFn: async ({ signal }) => {
      return apiClient.get("/api/topics", {
        schema: topicsListResponseSchema,
        signal,
      });
    },
    staleTime: 1000 * 60 * 60, // Topics rarely change, cache for 1 hour
  });
}

/**
 * Hook for retrieving operational pipeline metrics and cost telemetry.
 */
export function useClassificationMetricsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.classification.metrics(),
    queryFn: async ({ signal }) => {
      return apiClient.get("/api/admin/classification/metrics", {
        schema: classificationMetricsSchema,
        signal,
      });
    },
    enabled,
    refetchInterval: 1000 * 30, // Refetch every 30 seconds on monitoring view
  });
}

/**
 * Mutation hook for triggering retry of failed video classifications.
 */
export function useRetryFailedVideosMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ retriedCount: number }, Error, string[] | undefined>({
    mutationFn: async (videoIds?: string[]) => {
      return apiClient.post<{ retriedCount: number }>(
        "/api/admin/classification/retry-failed",
        { videoIds },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classification.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.all(),
      });
    },
  });
}

/**
 * Mutation hook for backfilling unclassified videos.
 */
export function useBackfillVideosMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ queuedCount: number }, Error, number | undefined>({
    mutationFn: async (limit?: number) => {
      return apiClient.post<{ queuedCount: number }>(
        "/api/admin/classification/backfill",
        { limit: limit ?? 500 },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classification.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.all(),
      });
    },
  });
}
