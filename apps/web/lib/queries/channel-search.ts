"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  channelSearchResponseSchema,
  type ChannelSearchResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

/**
 * Typed hook for searching channels by Name, @handle, or YouTube URL.
 * Queries both local database and live YouTube Data API.
 */
export function useSearchChannelsQuery(
  rawQuery?: string | null,
  options: { enabled?: boolean; debounceMs?: number } = {},
) {
  const { enabled = true, debounceMs = 250 } = options;
  const safeQuery = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const [debouncedQuery, setDebouncedQuery] = useState(safeQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(typeof rawQuery === "string" ? rawQuery.trim() : "");
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [rawQuery, debounceMs]);

  return useQuery({
    queryKey: queryKeys.youtube.channelSearch(debouncedQuery),
    queryFn: async ({ signal }) => {
      if (!debouncedQuery) {
        return { channels: [], total: 0 } as ChannelSearchResponse;
      }
      return apiClient.get("/api/youtube/channels/search", {
        params: { q: debouncedQuery },
        schema: channelSearchResponseSchema,
        signal,
      });
    },
    enabled: enabled && debouncedQuery.length > 0,
    staleTime: 30000,
  });
}

