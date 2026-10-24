"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  feedbackListResponseSchema,
  feedbackStatsResponseSchema,
  feedbackItemSchema,
  type CreateFeedbackInput,
  type FeedbackItem,
  type AdminFeedbackQuery,
  type AdminFeedbackQueryInput,
  type AdminUpdateFeedbackInput,
  type FeedbackListResponse,
  type FeedbackStatsResponse,
} from "@locus/contracts";
import { apiClient } from "../api-client";
import { queryKeys } from "../query-keys";

/**
 * Mutation hook for users/guests to submit a bug report or feature request.
 */
export function useCreateFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation<FeedbackItem, Error, CreateFeedbackInput>({
    mutationFn: async (input: CreateFeedbackInput) => {
      return apiClient.post<FeedbackItem>("/api/feedback", input, {
        schema: feedbackItemSchema,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedback.all(),
      });
    },
  });
}

/**
 * Query hook for administrators to retrieve paginated, filtered feedback tickets.
 */
export function useAdminFeedbackQuery(
  query: AdminFeedbackQueryInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.feedback.adminList(query as Record<string, unknown>),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (query.type) searchParams.set("type", query.type);
      if (query.status) searchParams.set("status", query.status);
      if (query.priority) searchParams.set("priority", query.priority);
      if (query.search) searchParams.set("search", query.search);
      if (query.page) searchParams.set("page", String(query.page));
      if (query.limit) searchParams.set("limit", String(query.limit));

      const url = `/api/admin/feedback${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      return apiClient.get<FeedbackListResponse>(url, {
        schema: feedbackListResponseSchema,
        signal,
      });
    },
    enabled,
    refetchInterval: 1000 * 30, // Refetch every 30s when on triage dashboard
  });
}

/**
 * Query hook for administrators to retrieve summary stats across feedback tickets.
 */
export function useAdminFeedbackStatsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.feedback.stats(),
    queryFn: async ({ signal }) => {
      return apiClient.get<FeedbackStatsResponse>("/api/admin/feedback/stats", {
        schema: feedbackStatsResponseSchema,
        signal,
      });
    },
    enabled,
    refetchInterval: 1000 * 30,
  });
}

/**
 * Mutation hook for administrators to update status, priority, or private notes.
 */
export function useUpdateFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    FeedbackItem,
    Error,
    { id: string; data: AdminUpdateFeedbackInput }
  >({
    mutationFn: async ({ id, data }) => {
      return apiClient.patch<FeedbackItem>(`/api/admin/feedback/${id}`, data, {
        schema: feedbackItemSchema,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedback.all(),
      });
    },
  });
}

/**
 * Mutation hook for administrators to delete a feedback ticket.
 */
export function useDeleteFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; id: string }, Error, string>({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ success: boolean; id: string }>(
        `/api/admin/feedback/${id}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedback.all(),
      });
    },
  });
}

