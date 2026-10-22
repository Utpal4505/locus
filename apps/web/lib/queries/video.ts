"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  videoDetailResponseSchema,
  type VideoDetailResponse,
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
