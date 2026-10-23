"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  globalSearchResponseSchema,
  type GlobalSearchResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

export function useGlobalSearchQuery(
  rawQuery: string,
  options: { enabled?: boolean; debounceMs?: number } = {},
) {
  const { enabled = true, debounceMs = 150 } = options;
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery.trim());

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [rawQuery, debounceMs]);

  return useQuery({
    queryKey: queryKeys.search.global(debouncedQuery),
    queryFn: async ({ signal }) => {
      if (!debouncedQuery) {
        return { videos: [], notes: [], channels: [] } as GlobalSearchResponse;
      }
      return apiClient.get("/api/search", {
        params: { q: debouncedQuery, limit: 6 },
        schema: globalSearchResponseSchema,
        signal,
      });
    },
    enabled: enabled && debouncedQuery.length > 0,
    staleTime: 30000,
  });
}

