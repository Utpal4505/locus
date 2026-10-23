"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  bulkFollowChannelRequestSchema,
  bulkFollowChannelResponseSchema,
  channelListResponseSchema,
  followChannelResponseSchema,
  subscriptionImportResponseSchema,
  youtubeStatusResponseSchema,
  syncStatusResponseSchema,
  videoSyncResponseSchema,
  type BulkFollowChannelRequest,
  type BulkFollowChannelResponse,
  type ChannelListResponse,
  type FollowChannelResponse,
  type SubscriptionImportResponse,
  type YoutubeStatusResponse,
  type SyncStatusResponse,
  type VideoSyncResponse,
} from "@locus/contracts";
import { useEffect, useRef } from "react";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

export interface UseYoutubeQueryOptions {
  enabled?: boolean;
}

/**
 * Typed hook for checking the authenticated user's YouTube integration status.
 * Performs runtime Zod validation against youtubeStatusResponseSchema.
 */
export function useYoutubeStatusQuery(
  options: UseYoutubeQueryOptions = {},
  queryOptions?: Omit<
    UseQueryOptions<
      YoutubeStatusResponse,
      Error,
      YoutubeStatusResponse,
      ReturnType<typeof queryKeys.youtube.status>
    >,
    "queryKey" | "queryFn"
  >,
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.youtube.status(),
    queryFn: async ({ signal }) => {
      return apiClient.get("/api/youtube/status", {
        schema: youtubeStatusResponseSchema,
        signal,
      });
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Typed hook for fetching the authenticated user's imported channel catalog.
 * Performs runtime Zod validation against channelListResponseSchema.
 */
export function useChannelListQuery(
  options: UseYoutubeQueryOptions = {},
  queryOptions?: Omit<
    UseQueryOptions<
      ChannelListResponse,
      Error,
      ChannelListResponse,
      ReturnType<typeof queryKeys.youtube.channels>
    >,
    "queryKey" | "queryFn"
  >,
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.youtube.channels(),
    queryFn: async ({ signal }) => {
      return apiClient.get("/api/youtube/channels", {
        schema: channelListResponseSchema,
        signal,
      });
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Typed mutation hook for importing the user's subscriptions from YouTube.
 * Performs runtime Zod validation against subscriptionImportResponseSchema.
 * Automatically invalidates the channels list query upon completion.
 */
export function useImportSubscriptionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post("/api/youtube/subscriptions/import", undefined, {
        schema: subscriptionImportResponseSchema,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.youtube.channels(),
      });
    },
  });
}

/**
 * Typed mutation hook for following a single channel.
 * On success, invalidates the channel list and feed queries.
 */
export function useFollowChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      return apiClient.post(
        `/api/youtube/channels/${channelId}/follow`,
        undefined,
        { schema: followChannelResponseSchema },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.youtube.channels(),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() }),
      ]);
    },
  });
}

/**
 * Typed mutation hook for unfollowing a channel.
 * On success, invalidates the channel list and feed queries.
 */
export function useUnfollowChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      return apiClient.post(`/api/youtube/channels/${channelId}/unfollow`);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.youtube.channels(),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() }),
      ]);
    },
  });
}

/**
 * Convenience toggle mutation: follows or unfollows based on `isFollowed`.
 * Inactivates both the channel catalog and feed queries on completion.
 */
export function useToggleFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      isCurrentlyFollowed,
    }: {
      channelId: string;
      isCurrentlyFollowed: boolean;
    }) => {
      const endpoint = isCurrentlyFollowed
        ? `/api/youtube/channels/${channelId}/unfollow`
        : `/api/youtube/channels/${channelId}/follow`;

      return apiClient.post(endpoint);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.youtube.channels(),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() }),
      ]);
    },
  });
}

/**
 * Typed mutation hook for following multiple channels in bulk.
 * Validates request payload against bulkFollowChannelRequestSchema and response
 * against bulkFollowChannelResponseSchema.
 * Invalidates both the channel list and feed queries on success.
 */
export function useBulkFollowChannelsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkFollowChannelRequest) => {
      return apiClient.post(
        "/api/youtube/channels/bulk-follow",
        data,
        { schema: bulkFollowChannelResponseSchema },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.youtube.channels(),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() }),
      ]);
    },
  });
}

/**
 * Typed hook for checking the authenticated user's YouTube synchronization status.
 * Automatically polls every 3 seconds while a sync is in progress (`isSyncing === true`),
 * or every 60 seconds when idle, keeping relative sync indicators accurate.
 */
export function useSyncStatusQuery(
  options: UseYoutubeQueryOptions = {},
  queryOptions?: Omit<
    UseQueryOptions<
      SyncStatusResponse,
      Error,
      SyncStatusResponse,
      ReturnType<typeof queryKeys.youtube.syncStatus>
    >,
    "queryKey" | "queryFn"
  >,
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.youtube.syncStatus(),
    queryFn: async ({ signal }) => {
      return apiClient.get("/api/youtube/sync/status", {
        schema: syncStatusResponseSchema,
        signal,
      });
    },
    refetchInterval: (query) => {
      // If actively syncing, poll rapidly (every 3 seconds) until finished
      if (query.state.data?.isSyncing) {
        return 3000;
      }
      // Otherwise poll every 60 seconds to refresh relative time ("12 minutes ago")
      return 60000;
    },
    refetchOnWindowFocus: true,
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook to trigger a background sync on app opening, strictly adhering to the 2-hour cooldown:
 * - Fires once per browser session mount when user is authenticated.
 * - The backend evaluates last successful sync time and skips if < 2 hours old (quota protection).
 * - Invalidates queries on completion to refresh the feed seamlessly.
 */
export function useAutoSyncOnOpen(enabled: boolean) {
  const queryClient = useQueryClient();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    // Trigger background sync with on_open trigger
    apiClient
      .post(
        "/api/youtube/videos/sync",
        { trigger: "on_open", force: false },
        { schema: videoSyncResponseSchema },
      )
      .then((res) => {
        // If videos were actually synced, invalidate feed
        if (!res.skipped && res.videosSynced > 0) {
          queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() });
        }
        // Always refresh sync status
        queryClient.invalidateQueries({
          queryKey: queryKeys.youtube.syncStatus(),
        });
      })
      .catch(() => {
        // Silent catch for background open sync so user view is never interrupted
        queryClient.invalidateQueries({
          queryKey: queryKeys.youtube.syncStatus(),
        });
      });
  }, [enabled, queryClient]);
}


