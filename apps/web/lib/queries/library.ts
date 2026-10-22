"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  libraryListResponseSchema,
  updateLibraryStateResponseSchema,
  type LibraryListResponse,
  type LibraryTab,
  type HistoryStatus,
  type UpdateLibraryStateRequest,
  type UpdateLibraryStateResponse,
  type FeedResponse,
  type VideoDetailResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

export interface UseLibraryQueryOptions {
  enabled?: boolean;
  limit?: number;
  status?: HistoryStatus;
}

/**
 * Typed hook for fetching items in the user's library filtered by tab.
 */
export function useLibraryQuery(
  tab: LibraryTab,
  options: UseLibraryQueryOptions = {},
  queryOptions?: Omit<
    UseQueryOptions<
      LibraryListResponse,
      Error,
      LibraryListResponse,
      ReturnType<typeof queryKeys.library.tab>
    >,
    "queryKey" | "queryFn"
  >,
) {
  const { enabled = true, limit = 50, status = "all" } = options;

  return useQuery({
    queryKey: queryKeys.library.tab(tab, status),
    queryFn: async ({ signal }) => {
      const statusParam = tab === "history" && status !== "all" ? `&status=${status}` : "";
      return apiClient.get(`/api/library?tab=${tab}&limit=${limit}${statusParam}`, {
        schema: libraryListResponseSchema,
        signal,
      });
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds
    ...queryOptions,
  });
}

/**
 * Mutation hook for updating video library state (watched, favorite, inQueue).
 * Implements optimistic updates across Feed, Library, and Video Detail query caches
 * for instant 0ms perceived latency.
 */
export function useUpdateVideoLibraryStateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      updates,
    }: {
      videoId: string;
      updates: UpdateLibraryStateRequest;
    }): Promise<UpdateLibraryStateResponse> => {
      return apiClient.patch(`/api/library/videos/${videoId}`, updates, {
        schema: updateLibraryStateResponseSchema,
      });
    },

    onMutate: async ({ videoId, updates }) => {
      // Cancel any outgoing queries so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.feed.all() });
      await queryClient.cancelQueries({ queryKey: queryKeys.library.all() });
      await queryClient.cancelQueries({ queryKey: queryKeys.videos.all() });

      // Snapshot previous values for rollback on error
      const previousFeedData = queryClient.getQueriesData<any>({
        queryKey: queryKeys.feed.all(),
      });
      const previousLibraryData = queryClient.getQueriesData<any>({
        queryKey: queryKeys.library.all(),
      });
      const previousVideoData = queryClient.getQueriesData<any>({
        queryKey: queryKeys.videos.all(),
      });

      // Optimistically update Feed Infinite queries
      queryClient.setQueriesData<any>(
        { queryKey: queryKeys.feed.all() },
        (oldData: any) => {
          if (!oldData) return oldData;

          // Infinite feed format (pages array)
          if (Array.isArray(oldData.pages)) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: FeedResponse) => ({
                ...page,
                items: page.items.map((item) => {
                  if (item.id !== videoId) return item;

                  const currentLib = item.library ?? {
                    isWatched: false,
                    isFavorite: false,
                    isInQueue: false,
                    progressSeconds: 0,
                  };

                  const willBeWatched =
                    updates.isWatched !== undefined
                      ? updates.isWatched
                      : currentLib.isWatched;

                  let willBeInQueue =
                    updates.isInQueue !== undefined
                      ? updates.isInQueue
                      : currentLib.isInQueue;

                  // Queue completion rule: If explicitly marked watched, auto-remove from queue
                  if (updates.isWatched === true) {
                    willBeInQueue = false;
                  }

                  const willBeFavorite =
                    updates.isFavorite !== undefined
                      ? updates.isFavorite
                      : currentLib.isFavorite;

                  return {
                    ...item,
                    library: {
                      isWatched: willBeWatched,
                      isInQueue: willBeInQueue,
                      isFavorite: willBeFavorite,
                      progressSeconds:
                        updates.progressSeconds ?? currentLib.progressSeconds,
                    },
                  };
                }),
              })),
            };
          }

          return oldData;
        },
      );

      // Optimistically update Library queries
      queryClient.setQueriesData<LibraryListResponse>(
        { queryKey: queryKeys.library.all() },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.items)) return oldData;

          return {
            ...oldData,
            items: oldData.items.map((item) => {
              if (item.id !== videoId) return item;

              const currentLib = item.library ?? {
                isWatched: false,
                isFavorite: false,
                isInQueue: false,
                progressSeconds: 0,
              };

              const willBeWatched =
                updates.isWatched !== undefined
                  ? updates.isWatched
                  : currentLib.isWatched;

              let willBeInQueue =
                updates.isInQueue !== undefined
                  ? updates.isInQueue
                  : currentLib.isInQueue;

              // Queue completion rule: If explicitly marked watched, auto-remove from queue
              if (updates.isWatched === true) {
                willBeInQueue = false;
              }

              const willBeFavorite =
                updates.isFavorite !== undefined
                  ? updates.isFavorite
                  : currentLib.isFavorite;

              return {
                ...item,
                library: {
                  isWatched: willBeWatched,
                  isInQueue: willBeInQueue,
                  isFavorite: willBeFavorite,
                  progressSeconds:
                    updates.progressSeconds ?? currentLib.progressSeconds,
                },
              };
            }),
          };
        },
      );

      // Optimistically update Video Detail queries across all keys in cache
      queryClient.setQueriesData<VideoDetailResponse>(
        { queryKey: queryKeys.videos.all() },
        (oldData: VideoDetailResponse | undefined): VideoDetailResponse | undefined => {
          if (!oldData || !oldData.id) return oldData;
          if (oldData.id !== videoId && oldData.youtubeVideoId !== videoId) {
            return oldData;
          }

          const currentLib = oldData.library ?? {
            isWatched: false,
            isFavorite: false,
            isInQueue: false,
            progressSeconds: 0,
            lastOpenedAt: null,
            watchedAt: null,
          };

          const willBeWatched =
            updates.isWatched !== undefined
              ? updates.isWatched
              : currentLib.isWatched;

          let willBeInQueue =
            updates.isInQueue !== undefined
              ? updates.isInQueue
              : currentLib.isInQueue;

          // Queue completion rule: If explicitly marked watched, auto-remove from queue
          if (updates.isWatched === true) {
            willBeInQueue = false;
          }

          const willBeFavorite =
            updates.isFavorite !== undefined
              ? updates.isFavorite
              : currentLib.isFavorite;

          return {
            ...oldData,
            library: {
              ...currentLib,
              isWatched: willBeWatched,
              isInQueue: willBeInQueue,
              isFavorite: willBeFavorite,
              progressSeconds:
                updates.progressSeconds ?? currentLib.progressSeconds,
              watchedAt: willBeWatched
                ? currentLib.watchedAt ?? new Date().toISOString()
                : null,
            },
          };
        },
      );

      return { previousFeedData, previousLibraryData, previousVideoData };
    },

    onError: (_err, _variables, context) => {
      // Rollback on mutation failure
      if (context?.previousFeedData) {
        context.previousFeedData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousLibraryData) {
        context.previousLibraryData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousVideoData) {
        context.previousVideoData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },

    onSettled: () => {
      // Re-sync with server state
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all() });
    },
  });
}

/**
 * Mutation hook for clearing all videos from the Watch Later / Queue.
 */
export function useClearQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.requestVoid({
        url: "/api/library/queue",
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.library.tab("queue"),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() });
    },
  });
}

/**
 * Mutation hook for clearing watch history.
 */
export function useClearHistoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.requestVoid({
        url: "/api/library/history",
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.library.tab("history"),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() });
    },
  });
}
