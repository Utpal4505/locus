"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  updateUserPreferencesRequestSchema,
  userPreferencesResponseSchema,
  type UpdateUserPreferencesRequest,
  type UserPreferencesResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

export interface UsePreferencesQueryOptions {
  enabled?: boolean;
}

/**
 * Typed hook for fetching the current user's preferences.
 * Validates the response against userPreferencesResponseSchema.
 */
export function useUserPreferencesQuery(
  options: UsePreferencesQueryOptions = {},
  queryOptions?: Omit<
    UseQueryOptions<
      UserPreferencesResponse,
      Error,
      UserPreferencesResponse,
      ReturnType<typeof queryKeys.preferences.current>
    >,
    "queryKey" | "queryFn"
  >,
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.preferences.current(),
    queryFn: async ({ signal }) => {
      return apiClient.get("/api/preferences", {
        schema: userPreferencesResponseSchema,
        signal,
      });
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Mutation hook for updating user preferences.
 * Automatically synchronizes TanStack query cache and invalidates affected feed queries.
 */
export function useUpdateUserPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateUserPreferencesRequest) => {
      // Validate outbound payload
      const validated = updateUserPreferencesRequestSchema.parse(payload);

      return apiClient.patch("/api/preferences", validated, {
        schema: userPreferencesResponseSchema,
      });
    },
    onSuccess: (updatedPreferences) => {
      // Update preferences cache immediately
      queryClient.setQueryData(
        queryKeys.preferences.current(),
        updatedPreferences,
      );

      // Invalidate feed queries so changes (e.g. hideWatchedVideos) reflect across the app
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.all(),
      });
    },
  });
}

