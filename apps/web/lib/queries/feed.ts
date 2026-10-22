"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  feedResponseSchema,
  videoSyncResponseSchema,
  type FeedResponse,
  type FeedStatus,
  type VideoSyncOptions,
  type VideoSyncResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

export interface UseFeedQueryOptions {
  limit?: number;
  cursor?: string;
  enabled?: boolean;
}

/**
 * Typed hook for fetching a single page of the chronological feed.
 * Performs runtime Zod validation against feedResponseSchema.
 */
export function useFeedQuery(
  options: UseFeedQueryOptions = {},
  queryOptions?: Omit<
    UseQueryOptions<
      FeedResponse,
      Error,
      FeedResponse,
      ReturnType<typeof queryKeys.feed.list>
    >,
    "queryKey" | "queryFn"
  >,
) {
  const { limit = 20, cursor, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.feed.list(limit, cursor),
    queryFn: async ({ signal }) => {
      const params: Record<string, unknown> = { limit };
      if (cursor) {
        params.cursor = cursor;
      }
      return apiClient.get("/api/feed", {
        params,
        schema: feedResponseSchema,
        signal,
      });
    },
    enabled,
    ...queryOptions,
  });
}

export interface UseInfiniteFeedQueryOptions {
  limit?: number;
  status?: FeedStatus;
  enabled?: boolean;
}

/**
 * Typed hook for cursor-paginated chronological feed via useInfiniteQuery.
 * Performs runtime Zod validation against feedResponseSchema on every page.
 */
export function useInfiniteFeedQuery(
  options: UseInfiniteFeedQueryOptions = {},
) {
  const { limit = 20, status = "all", enabled = true } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.feed.infinite(limit, status),
    queryFn: async ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit };
      if (pageParam) {
        params.cursor = pageParam;
      }
      if (status && status !== "all") {
        params.status = status;
      }
      return apiClient.get("/api/feed", {
        params,
        schema: feedResponseSchema,
        signal,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: FeedResponse) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled,
  });
}

/**
 * Typed mutation hook for syncing recent uploads from followed channels.
 * Automatically invalidates all feed queries on success.
 */
export function useSyncVideosMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: VideoSyncOptions) => {
      return apiClient.post("/api/youtube/videos/sync", options ?? {}, {
        schema: videoSyncResponseSchema,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.feed.all(),
      });
    },
  });
}
