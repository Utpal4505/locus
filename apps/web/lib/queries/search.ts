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
  rawQuery?: string | null,
  options: { enabled?: boolean; debounceMs?: number } = {},
) {
  const { enabled = true, debounceMs = 150 } = options;
  const safeQuery = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const [debouncedQuery, setDebouncedQuery] = useState(safeQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(typeof rawQuery === "string" ? rawQuery.trim() : "");
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

