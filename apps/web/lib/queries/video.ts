"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  videoDetailResponseSchema,
  videoNoteResponseSchema,
  type VideoDetailResponse,
  type VideoNoteResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

export function useVideoQuery(
  id: string,
  queryOptions?: Omit<
    UseQueryOptions<
      VideoDetailResponse,
      Error,
      VideoDetailResponse,
      ReturnType<typeof queryKeys.videos.detail>
    >,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: queryKeys.videos.detail(id),
    queryFn: async ({ signal }) => {
      return apiClient.get(`/api/videos/${encodeURIComponent(id)}`, {
        schema: videoDetailResponseSchema,
        signal,
      });
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    ...queryOptions,
  });
}

/**
 * Fetches private technical notes for a specific video.
 */
export function useVideoNotesQuery(
  videoId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.videos.notes(videoId),
    queryFn: async ({ signal }) => {
      return apiClient.get(`/api/videos/${encodeURIComponent(videoId)}/notes`, {
        schema: videoNoteResponseSchema,
        signal,
      });
    },
    enabled: Boolean(videoId) && enabled,
    staleTime: 60_000,
  });
}

/**
 * Saves or updates private technical notes for a video.
 */
export function useUpdateVideoNotesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      content,
    }: {
      videoId: string;
      content: string;
    }): Promise<VideoNoteResponse> => {
      return apiClient.put(
        `/api/videos/${encodeURIComponent(videoId)}/notes`,
        { content },
        { schema: videoNoteResponseSchema },
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        queryKeys.videos.notes(variables.videoId),
        data,
      );
    },
  });
}
